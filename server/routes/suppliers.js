import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single supplier
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create supplier (admin and audit_manager only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ name, contact, phone, email, address }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update supplier (admin and audit_manager only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;

    const { data, error } = await supabase
      .from('suppliers')
      .update({ name, contact, phone, email, address })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete supplier (admin and audit_manager only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
