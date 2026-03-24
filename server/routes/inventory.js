import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const logAudit = (userId, action, recordId, oldValues, newValues, ipAddress) => {
  db.prepare(
    'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    userId,
    action,
    'inventory',
    recordId,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    ipAddress
  );
};

const isEditingFrozen = (userRole) => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  return dayOfMonth > 15 && userRole === 'user';
};

router.get('/', authenticateToken, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM inventory ORDER BY last_updated DESC').all();
    res.json(items);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  try {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  const { name, category, quantity, price, supplier, location, min_stock, max_stock } = req.body;

  if (!name || !category || quantity === undefined || !price || !location) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO inventory (name, category, quantity, price, supplier, location, min_stock, max_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name,
      category,
      quantity,
      price,
      supplier || null,
      location,
      min_stock || 10,
      max_stock || 100
    );

    const newItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid);

    logAudit(req.user.id, 'created', result.lastInsertRowid, null, newItem, req.ip);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, price, supplier, location, min_stock, max_stock } = req.body;

  if (isEditingFrozen(req.user.role)) {
    return res.status(403).json({ error: 'Editing is frozen after the 15th of the month' });
  }

  if (!name || !category || quantity === undefined || !price || !location) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const oldItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);

    if (!oldItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare(
      'UPDATE inventory SET name = ?, category = ?, quantity = ?, price = ?, supplier = ?, location = ?, min_stock = ?, max_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, category, quantity, price, supplier || null, location, min_stock || 10, max_stock || 100, id);

    const updatedItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);

    logAudit(req.user.id, 'updated', id, oldItem, updatedItem, req.ip);

    res.json(updatedItem);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  if (isEditingFrozen(req.user.role)) {
    return res.status(403).json({ error: 'Editing is frozen after the 15th of the month' });
  }

  try {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare('DELETE FROM inventory WHERE id = ?').run(id);

    logAudit(req.user.id, 'deleted', id, item, null, req.ip);

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count;
    const lowStockItems = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_stock').get().count;
    const totalValue = db.prepare('SELECT SUM(quantity * price) as value FROM inventory').get().value || 0;

    res.json({
      totalItems,
      lowStockItems,
      totalValue: parseFloat(totalValue.toFixed(2)),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
