/**
 * Serviço de Gerenciamento de API Keys
 * Integração com Supabase para armazenamento seguro
 */

import { supabase } from './supabase';
import { encryptApiKey, decryptApiKey, maskApiKey, validateApiKeyFormat } from './encryption';

export interface Institution {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  header_template?: string;
  footer_template?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  institution_id: string;
  provider: string;
  key_encrypted: string;
  key_name?: string;
  active: boolean;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyDecrypted extends Omit<ApiKey, 'key_encrypted'> {
  key_decrypted: string;
  key_masked: string;
}

/**
 * Obtém todas as instituições
 */
export async function getInstitutions(): Promise<Institution[]> {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .order('display_name');

  if (error) {
    console.error('Erro ao buscar instituições:', error);
    throw error;
  }

  return data || [];
}

/**
 * Obtém instituição por nome
 */
export async function getInstitutionByName(name: string): Promise<Institution | null> {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    console.error('Erro ao buscar instituição:', error);
    return null;
  }

  return data;
}

/**
 * Cria nova instituição
 */
export async function createInstitution(
  name: string,
  displayName: string,
  logoUrl?: string
): Promise<Institution> {
  const { data, error } = await supabase
    .from('institutions')
    .insert({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      display_name: displayName,
      logo_url: logoUrl,
      active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar instituição:', error);
    throw error;
  }

  return data;
}

/**
 * Obtém todas as API keys de uma instituição
 */
export async function getApiKeys(institutionId: string): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('institution_id', institutionId)
    .order('provider');

  if (error) {
    console.error('Erro ao buscar API keys:', error);
    throw error;
  }

  return data || [];
}

/**
 * Obtém API keys descriptografadas de uma instituição
 */
export async function getApiKeysDecrypted(institutionId: string): Promise<ApiKeyDecrypted[]> {
  const keys = await getApiKeys(institutionId);
  
  const decryptedKeys = await Promise.all(
    keys.map(async (key) => {
      try {
        const decrypted = await decryptApiKey(key.key_encrypted);
        return {
          ...key,
          key_decrypted: decrypted,
          key_masked: maskApiKey(decrypted)
        };
      } catch (error) {
        console.error(`Erro ao descriptografar key ${key.id}:`, error);
        return {
          ...key,
          key_decrypted: '',
          key_masked: '*** erro ***'
        };
      }
    })
  );

  return decryptedKeys;
}

/**
 * Obtém API key específica de um provedor
 */
export async function getApiKeyByProvider(
  institutionId: string,
  provider: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('key_encrypted')
    .eq('institution_id', institutionId)
    .eq('provider', provider.toLowerCase())
    .eq('active', true)
    .single();

  if (error || !data) {
    return null;
  }

  try {
    return await decryptApiKey(data.key_encrypted);
  } catch (error) {
    console.error(`Erro ao descriptografar key do ${provider}:`, error);
    return null;
  }
}

/**
 * Salva ou atualiza API key
 */
export async function saveApiKey(
  institutionId: string,
  provider: string,
  apiKey: string,
  keyName?: string
): Promise<ApiKey> {
  // Validar formato
  if (!validateApiKeyFormat(apiKey, provider)) {
    throw new Error(`Formato inválido para API key do ${provider}`);
  }

  // Criptografar
  const encrypted = await encryptApiKey(apiKey);

  // Verificar se já existe
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('provider', provider.toLowerCase())
    .single();

  if (existing) {
    // Atualizar existente
    const { data, error } = await supabase
      .from('api_keys')
      .update({
        key_encrypted: encrypted,
        key_name: keyName,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar API key:', error);
      throw error;
    }

    return data;
  } else {
    // Criar nova
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        institution_id: institutionId,
        provider: provider.toLowerCase(),
        key_encrypted: encrypted,
        key_name: keyName,
        active: true,
        usage_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar API key:', error);
      throw error;
    }

    return data;
  }
}

/**
 * Ativa/desativa API key
 */
export async function toggleApiKey(keyId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ active })
    .eq('id', keyId);

  if (error) {
    console.error('Erro ao alterar status da API key:', error);
    throw error;
  }
}

/**
 * Deleta API key
 */
export async function deleteApiKey(keyId: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId);

  if (error) {
    console.error('Erro ao deletar API key:', error);
    throw error;
  }
}

/**
 * Registra uso de API key
 */
export async function recordApiKeyUsage(institutionId: string, provider: string): Promise<void> {
  const { data } = await supabase
    .from('api_keys')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('provider', provider.toLowerCase())
    .single();

  if (data) {
    await supabase.rpc('record_api_key_usage', { p_api_key_id: data.id });
  }
}

/**
 * Obtém todas as API keys ativas para uso no sistema
 * Retorna objeto com chaves prontas para uso
 */
export async function getActiveApiKeysForUse(institutionId: string): Promise<{
  cerebras?: string;
  qwen?: string;
  groq?: string;
  gemini?: string;
  [key: string]: string | undefined;
}> {
  const keys = await getApiKeysDecrypted(institutionId);
  const activeKeys = keys.filter(k => k.active);

  const result: { [key: string]: string | undefined } = {};
  
  for (const key of activeKeys) {
    result[key.provider] = key.key_decrypted;
  }

  return result;
}

/**
 * Testa conexão com API usando a key armazenada
 */
export async function testApiKey(
  institutionId: string,
  provider: string
): Promise<{ success: boolean; message: string }> {
  const apiKey = await getApiKeyByProvider(institutionId, provider);
  
  if (!apiKey) {
    return { success: false, message: 'API key não encontrada' };
  }

  // Testar conexão baseado no provedor
  try {
    switch (provider.toLowerCase()) {
      case 'cerebras':
        // Teste simples de conexão
        const cerebrasResponse = await fetch('https://api.cerebras.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return {
          success: cerebrasResponse.ok,
          message: cerebrasResponse.ok ? 'Conexão OK' : 'Falha na autenticação'
        };

      case 'qwen':
        // Teste com Qwen
        const qwenResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return {
          success: qwenResponse.ok,
          message: qwenResponse.ok ? 'Conexão OK' : 'Falha na autenticação'
        };

      case 'groq':
        // Teste com Groq
        const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return {
          success: groqResponse.ok,
          message: groqResponse.ok ? 'Conexão OK' : 'Falha na autenticação'
        };

      default:
        return { success: true, message: 'Formato válido (teste de conexão não implementado)' };
    }
  } catch (error) {
    return { success: false, message: `Erro: ${error}` };
  }
}

/**
 * Obtém estatísticas de uso das API keys
 */
export async function getApiKeysStats(institutionId: string): Promise<{
  total: number;
  active: number;
  inactive: number;
  totalUsage: number;
}> {
  const keys = await getApiKeys(institutionId);
  
  return {
    total: keys.length,
    active: keys.filter(k => k.active).length,
    inactive: keys.filter(k => !k.active).length,
    totalUsage: keys.reduce((sum, k) => sum + k.usage_count, 0)
  };
}
