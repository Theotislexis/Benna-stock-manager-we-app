import { supabase } from '../lib/supabase';
import { auditService } from './audit.service';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  supplier?: string;
  location: string;
  min_stock: number;
  max_stock: number;
  last_updated: string;
}

export const inventoryService = {
  async getAll(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) throw error;
    return data as InventoryItem[];
  },

  async getById(id: string): Promise<InventoryItem | null> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as InventoryItem | null;
  },

  async create(item: Omit<InventoryItem, 'id' | 'last_updated'>): Promise<InventoryItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        ...item,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'CREATE',
      table_name: 'inventory',
      record_id: data.id,
      new_values: data,
    });

    return data as InventoryItem;
  },

  async update(id: string, updates: Partial<Omit<InventoryItem, 'id'>>): Promise<InventoryItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const oldItem = await this.getById(id);

    const { data, error } = await supabase
      .from('inventory')
      .update({
        ...updates,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'UPDATE',
      table_name: 'inventory',
      record_id: id,
      old_values: oldItem,
      new_values: data,
    });

    return data as InventoryItem;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const oldItem = await this.getById(id);

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await auditService.log({
      action: 'DELETE',
      table_name: 'inventory',
      record_id: id,
      old_values: oldItem,
    });
  },

  async search(query: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .or(`name.ilike.%${query}%,category.ilike.%${query}%,location.ilike.%${query}%`)
      .order('last_updated', { ascending: false });

    if (error) throw error;
    return data as InventoryItem[];
  },
};
