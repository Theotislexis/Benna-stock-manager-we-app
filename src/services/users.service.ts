import { supabase } from '../lib/supabase';
import { User } from './auth.service';
import { auditService } from './audit.service';

export const usersService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as User[];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as User | null;
  },

  async create(params: {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'audit_manager' | 'user';
  }): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: params.email,
        name: params.name,
        role: params.role,
      })
      .select()
      .single();

    if (error) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw error;
    }

    await auditService.log({
      action: 'CREATE',
      table_name: 'users',
      record_id: data.id,
      new_values: { email: data.email, name: data.name, role: data.role },
    });

    return data as User;
  },

  async update(id: string, updates: Partial<Pick<User, 'name' | 'role'>>): Promise<User> {
    const oldUser = await this.getById(id);

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await auditService.log({
      action: 'UPDATE',
      table_name: 'users',
      record_id: id,
      old_values: oldUser,
      new_values: data,
    });

    return data as User;
  },

  async delete(id: string): Promise<void> {
    const oldUser = await this.getById(id);

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) console.error('Failed to delete auth user:', authError);

    await auditService.log({
      action: 'DELETE',
      table_name: 'users',
      record_id: id,
      old_values: oldUser,
    });
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) throw error;

    await auditService.log({
      action: 'UPDATE_PASSWORD',
      table_name: 'users',
      record_id: id,
      new_values: { password_updated: true },
    });
  },
};
