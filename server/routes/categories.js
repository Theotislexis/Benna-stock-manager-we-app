import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_en');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single category
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create category (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name_en, name_fr } = req.body;

    if (!name_en || !name_fr) {
      return res.status(400).json({
        message: 'Both English and French names are required'
      });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name_en, name_fr }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name_en, name_fr } = req.body;

    const { data, error } = await supabase
      .from('categories')
      .update({ name_en, name_fr })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if category is in use
    const { data: inventoryItems, error: checkError } = await supabase
      .from('inventory')
      .select('id')
      .eq('category_id', req.params.id)
      .limit(1);

    if (checkError) throw checkError;

    if (inventoryItems && inventoryItems.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete category that is in use by inventory items'
      });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
