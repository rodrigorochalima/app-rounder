/**
 * Serviço de API Keys
 * Gerencia chaves de API com criptografia
 */


import type { APIKey, DecryptedAPIKey, CreateAPIKeyData, UpdateAPIKeyData, AIProvider } from '@/types/api-key.types';
import { encryptText, decryptText } from '@/lib/encryption';
import { createAuditLog } from '../audit/audit.service';

/**
 * Busca todas as API keys de uma instituição
 */
export async function getAPIKeys(institutionId: string): Promise<APIKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar API keys: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca API key descriptografada (apenas em memória)
 */
export async function getDecryptedAPIKey(keyId: string): Promise<DecryptedAPIKey> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', keyId)
    .single();

  if (error || !data) {
    throw new Error(`Erro ao buscar API key: ${error?.message}`);
  }

  // Descriptografar
  const decryptedKey = decryptText(data.encrypted_key, data.encryption_iv);

  return {
    id: data.id,
    institutionId: data.institution_id,
    provider: data.provider,
    name: data.name,
    key: decryptedKey,
    isActive: data.is_active,
    isDefault: data.is_default,
    usageCount: data.usage_count,
    lastUsedAt: data.last_used_at,
    monthlyLimit: data.monthly_limit,
    costPerMillionTokens: data.cost_per_million_tokens,
    notes: data.notes,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Busca API key padrão para um provider
 */
export async function getDefaultAPIKeyForProvider(
  institutionId: string,
  provider: AIProvider
): Promise<DecryptedAPIKey | null> {
  const { data: defaultData, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('provider', provider)
    .eq('is_active', true)
    .eq('is_default', true)
    .single();

  let data = defaultData;
  
  if (error || !data) {
    // Se não tem default, pega a primeira ativa
    const { data: firstActive } = await supabase
      .from('api_keys')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('provider', provider)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!firstActive) return null;
    data = firstActive;
  }

  const decryptedKey = decryptText(data.encrypted_key, data.encryption_iv);

  return {
    id: data.id,
    institutionId: data.institution_id,
    provider: data.provider,
    name: data.name,
    key: decryptedKey,
    isActive: data.is_active,
    isDefault: data.is_default,
    usageCount: data.usage_count,
    lastUsedAt: data.last_used_at,
    monthlyLimit: data.monthly_limit,
    costPerMillionTokens: data.cost_per_million_tokens,
    notes: data.notes,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Cria nova API key
 */
export async function createAPIKey(
  institutionId: string,
  keyData: CreateAPIKeyData
): Promise<APIKey> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Criptografar a chave
  const { encrypted, iv } = encryptText(keyData.key);

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      institution_id: institutionId,
      provider: keyData.provider,
      name: keyData.name,
      encrypted_key: encrypted,
      encryption_iv: iv,
      monthly_limit: keyData.monthlyLimit,
      cost_per_million_tokens: keyData.costPerMillionTokens,
      notes: keyData.notes,
      created_by: user.id
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar API key: ${error?.message}`);
  }

  await createAuditLog({
    userId: user.id,
    institutionId,
    action: 'api_key_created',
    resourceType: 'api_key',
    resourceId: data.id,
    details: { provider: keyData.provider, name: keyData.name }
  });

  return data;
}

/**
 * Atualiza API key
 */
export async function updateAPIKey(
  keyId: string,
  updates: UpdateAPIKeyData
): Promise<APIKey> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('api_keys')
    .update({
      name: updates.name,
      is_active: updates.isActive,
      is_default: updates.isDefault,
      monthly_limit: updates.monthlyLimit,
      notes: updates.notes
    })
    .eq('id', keyId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao atualizar API key: ${error?.message}`);
  }

  await createAuditLog({
    userId: user.id,
    institutionId: data.institution_id,
    action: 'api_key_updated',
    resourceType: 'api_key',
    resourceId: keyId,
    details: updates
  });

  return data;
}

/**
 * Deleta API key
 */
export async function deleteAPIKey(keyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar dados antes de deletar (para audit)
  const { data: keyData } = await supabase
    .from('api_keys')
    .select('institution_id, provider, name')
    .eq('id', keyId)
    .single();

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId);

  if (error) {
    throw new Error(`Erro ao deletar API key: ${error.message}`);
  }

  if (keyData) {
    await createAuditLog({
      userId: user.id,
      institutionId: keyData.institution_id,
      action: 'api_key_deleted',
      resourceType: 'api_key',
      resourceId: keyId,
      details: { provider: keyData.provider, name: keyData.name }
    });
  }
}

/**
 * Testa conexão com API key
 */
export async function testAPIKey(keyId: string): Promise<boolean> {
  const key = await getDecryptedAPIKey(keyId);
  
  // TODO: Implementar teste real com cada provider
  // Por enquanto, apenas simula
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return true;
}

/**
 * Incrementa contador de uso
 */
export async function incrementUsage(keyId: string): Promise<void> {
  await supabase.rpc('increment_api_key_usage', { key_id: keyId });
  
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}
