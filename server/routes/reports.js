import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get usage report (parts most frequently used based on audit logs)
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;

    // Build query for audit logs showing quantity changes
    let query = supabase
      .from('audit_logs')
      .select('record_id, old_values, new_values, timestamp')
      .eq('table_name', 'inventory')
      .eq('action', 'UPDATE');

    if (start_date) {
      query = query.gte('timestamp', start_date);
    }

    if (end_date) {
      query = query.lte('timestamp', end_date);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) throw logsError;

    // Calculate usage (quantity decrease) for each inventory item
    const usageMap = {};

    logs.forEach(log => {
      try {
        const oldValues = typeof log.old_values === 'string'
          ? JSON.parse(log.old_values)
          : log.old_values;
        const newValues = typeof log.new_values === 'string'
          ? JSON.parse(log.new_values)
          : log.new_values;

        if (oldValues.quantity !== undefined && newValues.quantity !== undefined) {
          const quantityChange = oldValues.quantity - newValues.quantity;

          if (quantityChange > 0) {
            if (!usageMap[log.record_id]) {
              usageMap[log.record_id] = 0;
            }
            usageMap[log.record_id] += quantityChange;
          }
        }
      } catch (e) {
        console.error('Error parsing audit log:', e);
      }
    });

    // Get inventory items with usage data
    const itemIds = Object.keys(usageMap);

    if (itemIds.length === 0) {
      return res.json([]);
    }

    let inventoryQuery = supabase
      .from('inventory')
      .select(`
        id,
        name,
        category_id,
        category:categories(id, name_en, name_fr),
        quantity,
        min_stock
      `)
      .in('id', itemIds);

    if (category_id) {
      inventoryQuery = inventoryQuery.eq('category_id', category_id);
    }

    const { data: items, error: itemsError } = await inventoryQuery;

    if (itemsError) throw itemsError;

    // Combine usage data with inventory data
    const usageReport = items
      .map(item => ({
        ...item,
        usage: usageMap[item.id] || 0,
        usage_percentage: item.quantity > 0
          ? ((usageMap[item.id] || 0) / (item.quantity + (usageMap[item.id] || 0)) * 100).toFixed(2)
          : 0
      }))
      .sort((a, b) => b.usage - a.usage);

    res.json(usageReport);
  } catch (error) {
    console.error('Error generating usage report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get low stock report
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        category:categories(id, name_en, name_fr)
      `)
      .filter('quantity', 'lte', supabase.raw('min_stock'))
      .order('quantity');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error generating low stock report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get inventory value report
router.get('/inventory-value', authenticateToken, async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = supabase
      .from('inventory')
      .select(`
        id,
        name,
        quantity,
        price,
        category:categories(id, name_en, name_fr)
      `);

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: items, error } = await query;

    if (error) throw error;

    const itemsWithValue = items.map(item => ({
      ...item,
      total_value: item.quantity * item.price
    }));

    const totalValue = itemsWithValue.reduce((sum, item) => sum + item.total_value, 0);

    res.json({
      items: itemsWithValue,
      totalValue,
      itemCount: items.length
    });
  } catch (error) {
    console.error('Error generating inventory value report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
