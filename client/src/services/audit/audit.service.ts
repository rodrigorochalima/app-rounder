/**
 * Serviço de Auditoria (simplificado - sem Supabase)
 * Registra logs localmente no console
 */
export interface AuditLogData {
  userId?: string;
  institutionId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  // Log apenas no console - sem banco de dados de auditoria por enquanto
  console.log('[AUDIT]', data.action, data);
}

export async function getAuditLogs(_filters: any) {
  return [];
}
