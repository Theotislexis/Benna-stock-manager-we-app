import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get usage report
router.get('/usage', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;

    let sql = `SELECT record_id, old_values, new_values, timestamp FROM audit_logs WHERE table_name = 'inventory' AND action = 'updated'`;
    const params = [];

    if (start_date) {
      sql += ` AND timestamp >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      sql += ` AND timestamp <= ?`;
      params.push(end_date);
    }

    const logs = db.prepare(sql).all(...params);

    const usageMap = {};

    logs.forEach(log => {
      try {
        const oldValues = typeof log.old_values === 'string' ? JSON.parse(log.old_values) : Object(log.old_values);
        const newValues = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : Object(log.new_values);

        if (oldValues && newValues && oldValues.quantity !== undefined && newValues.quantity !== undefined) {
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

    const itemIds = Object.keys(usageMap);

    if (itemIds.length === 0) {
      return res.json([]);
    }

    const placeHolders = itemIds.map(() => '?').join(',');
    let invSql = `
      SELECT i.id, i.name, i.category as category_id, i.quantity, i.min_stock, c.name_en, c.name_fr 
      FROM inventory i
      LEFT JOIN categories c ON i.category = c.id
      WHERE i.id IN (${placeHolders})
    `;
    const invParams = [...itemIds];

    if (category_id) {
      invSql += ` AND i.category = ?`;
      invParams.push(category_id);
    }

    const items = db.prepare(invSql).all(...invParams);

    const usageReport = items
      .map(item => ({
        id: item.id,
        name: item.name,
        category_id: item.category_id,
        category: item.name_en ? { id: item.category_id, name_en: item.name_en, name_fr: item.name_fr } : null,
        quantity: item.quantity,
        min_stock: item.min_stock,
        usage: usageMap[item.id] || 0,
        usage_percentage: item.quantity > 0
          ? (((usageMap[item.id] || 0) / (item.quantity + (usageMap[item.id] || 0))) * 100).toFixed(2)
          : 0
      }))
      .sort((a, b) => b.usage - a.usage);

    res.json(usageReport);
  } catch (error) {
    console.error('Error generating usage report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get low stock report
router.get('/low-stock', authenticateToken, (req, res) => {
  try {
    const sql = `
      SELECT i.*, c.id as cat_id, c.name_en, c.name_fr
      FROM inventory i
      LEFT JOIN categories c ON i.category = c.id
      WHERE i.quantity <= i.min_stock
      ORDER BY i.quantity ASC
    `;
    const itemsRaw = db.prepare(sql).all();

    const data = itemsRaw.map(item => ({
      ...item,
      category: item.cat_id ? { id: item.cat_id, name_en: item.name_en, name_fr: item.name_fr } : null
    }));

    res.json(data);
  } catch (error) {
    console.error('Error generating low stock report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inventory value report
router.get('/inventory-value', authenticateToken, (req, res) => {
  try {
    const { category_id } = req.query;

    let sql = `
      SELECT i.id, i.name, i.quantity, i.price, c.id as cat_id, c.name_en, c.name_fr
      FROM inventory i
      LEFT JOIN categories c ON i.category = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      sql += ` AND i.category = ?`;
      params.push(category_id);
    }

    const itemsRaw = db.prepare(sql).all(...params);

    const itemsWithValue = itemsRaw.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total_value: item.quantity * item.price,
      category: item.cat_id ? { id: item.cat_id, name_en: item.name_en, name_fr: item.name_fr } : null
    }));

    const totalValue = itemsWithValue.reduce((sum, item) => sum + item.total_value, 0);

    res.json({
      items: itemsWithValue,
      totalValue,
      itemCount: itemsWithValue.length
    });
  } catch (error) {
    console.error('Error generating inventory value report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get audit logs for export
router.get('/audit-logs', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT al.*, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ` AND al.timestamp >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      // Add end of day for comparison
      sql += ` AND al.timestamp <= ?`;
      params.push(`${end_date} 23:59:59`);
    }

    sql += ` ORDER BY al.timestamp DESC`;

    const logs = db.prepare(sql).all(...params);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
