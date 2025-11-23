/**
 * Serviço de Auditoria
 * Registra logs de ações dos usuários
 */

import { supabase } from '@/lib/supabase';

export interface AuditLogData {
  userId?: string;
  institutionId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Cria um log de auditoria
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    // Obter IP e User Agent do navegador
    const ipAddress = await getUserIP();
    const userAgent = navigator.userAgent;

    await supabase.from('audit_logs').insert({
      user_id: data.userId,
      institution_id: data.institutionId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      details: data.details,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  } catch (error) {
    // Não falhar a operação principal se o log falhar
    console.error('Erro ao criar log de auditoria:', error);
  }
}

/**
 * Obtém IP do usuário (aproximado)
 */
async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

/**
 * Busca logs de auditoria
 */
export async function getAuditLogs(filters: {
  userId?: string;
  institutionId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.institutionId) {
    query = query.eq('institution_id', filters.institutionId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar logs: ${error.message}`);
  }

  return data || [];
}
