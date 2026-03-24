import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all orders with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { supplier_id, status, start_date, end_date, unpaid } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(id, name),
        items:order_items(*)
      `)
      .order('order_date', { ascending: false });

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('order_date', start_date);
    }

    if (end_date) {
      query = query.lte('order_date', end_date);
    }

    if (unpaid === 'true') {
      query = query.in('status', ['pending', 'partial']);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate balance for each order
    const ordersWithBalance = data.map(order => ({
      ...order,
      balance: order.total_amount - order.paid_amount
    }));

    res.json(ordersWithBalance);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:order_items(*),
        payments:payments(*)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderWithBalance = {
      ...data,
      balance: data.total_amount - data.paid_amount
    };

    res.json(orderWithBalance);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get outstanding payments summary
router.get('/summary/outstanding', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, paid_amount, supplier:suppliers(name), order_date')
      .in('status', ['pending', 'partial'])
      .order('order_date', { ascending: false });

    if (error) throw error;

    const totalOutstanding = data.reduce((sum, order) =>
      sum + (order.total_amount - order.paid_amount), 0
    );

    const ordersWithHighBalance = data
      .map(order => ({
        ...order,
        balance: order.total_amount - order.paid_amount
      }))
      .filter(order => order.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    res.json({
      totalOutstanding,
      count: data.length,
      recentHighBalance: ordersWithHighBalance
    });
  } catch (error) {
    console.error('Error fetching outstanding payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order (admin and audit_manager only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { supplier_id, expected_date, notes, items } = req.body;

    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier and items are required' });
    }

    // Calculate total amount from items
    const total_amount = items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        supplier_id,
        expected_date,
        total_amount,
        notes,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      inventory_item_id: item.inventory_item_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Fetch complete order
    const { data: completeOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:order_items(*)
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(completeOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order (admin and audit_manager only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { supplier_id, expected_date, status, notes } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .update({ supplier_id, expected_date, status, notes })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete order (admin and audit_manager only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add item to order
router.post('/:id/items', authenticateToken, async (req, res) => {
  try {
    const { inventory_item_id, description, quantity, unit_price } = req.body;

    if (!description || !quantity || !unit_price) {
      return res.status(400).json({ message: 'Description, quantity, and unit price are required' });
    }

    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .insert([{
        order_id: req.params.id,
        inventory_item_id,
        description,
        quantity,
        unit_price
      }])
      .select()
      .single();

    if (itemError) throw itemError;

    // Recalculate order total
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, unit_price')
      .eq('order_id', req.params.id);

    if (itemsError) throw itemsError;

    const total_amount = items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );

    const { error: updateError } = await supabase
      .from('orders')
      .update({ total_amount })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding order item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order item
router.put('/:orderId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { inventory_item_id, description, quantity, unit_price } = req.body;

    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .update({ inventory_item_id, description, quantity, unit_price })
      .eq('id', req.params.itemId)
      .eq('order_id', req.params.orderId)
      .select()
      .single();

    if (itemError) throw itemError;

    // Recalculate order total
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, unit_price')
      .eq('order_id', req.params.orderId);

    if (itemsError) throw itemsError;

    const total_amount = items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );

    const { error: updateError } = await supabase
      .from('orders')
      .update({ total_amount })
      .eq('id', req.params.orderId);

    if (updateError) throw updateError;

    res.json(item);
  } catch (error) {
    console.error('Error updating order item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete order item
router.delete('/:orderId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('id', req.params.itemId)
      .eq('order_id', req.params.orderId);

    if (deleteError) throw deleteError;

    // Recalculate order total
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, unit_price')
      .eq('order_id', req.params.orderId);

    if (itemsError) throw itemsError;

    const total_amount = items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );

    const { error: updateError } = await supabase
      .from('orders')
      .update({ total_amount })
      .eq('id', req.params.orderId);

    if (updateError) throw updateError;

    res.json({ message: 'Order item deleted successfully' });
  } catch (error) {
    console.error('Error deleting order item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
