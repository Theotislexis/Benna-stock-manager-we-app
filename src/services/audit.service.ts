import { supabase } from '../lib/supabase';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  timestamp: string;
}

export const auditService = {
  async log(params: {
    action: string;
    table_name: string;
    record_id: string;
    old_values?: any;
    new_values?: any;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: params.action,
        table_name: params.table_name,
        record_id: params.record_id,
        old_values: params.old_values || null,
        new_values: params.new_values || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  },

  async getAll(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data as AuditLog[];
  },

  async getByUser(userId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data as AuditLog[];
  },

  async getByTable(tableName: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', tableName)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data as AuditLog[];
  },
};
