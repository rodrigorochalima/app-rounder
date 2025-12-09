/**
 * Serviço de Gestão Multi-Usuário de API Keys
 * Cada usuário gerencia suas próprias APIs com controle de uso e limites
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type AIProvider = 
  | 'qwen' 
  | 'gemini' 
  | 'openai' 
  | 'groq' 
  | 'cerebras' 
  | 'cohere' 
  | 'mistral' 
  | 'deepseek';

export interface UserAPIKey {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  encryption_iv: string;
  name?: string;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  tokens_used: number;
  last_used_at?: string;
  monthly_limit?: number;
  monthly_token_limit?: number;
  cost_per_million_tokens?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface APIKeyStats {
  provider: AIProvider;
  total_keys: number;
  active_keys: number;
  total_usage: number;
  total_tokens: number;
  last_used?: string;
}

export interface CreateAPIKeyData {
  provider: AIProvider;
  api_key: string; // Será criptografada
  name?: string;
  is_default?: boolean;
  monthly_limit?: number;
  monthly_token_limit?: number;
  cost_per_million_tokens?: number;
  notes?: string;
}

export interface UpdateAPIKeyData {
  name?: string;
  is_active?: boolean;
  is_default?: boolean;
  monthly_limit?: number;
  monthly_token_limit?: number;
  notes?: string;
}

// ============================================
// CRIPTOGRAFIA (simples - pode melhorar)
// ============================================

function encryptAPIKey(key: string): { encrypted: string; iv: string } {
  // Por enquanto, apenas encode em base64
  // TODO: Implementar AES-256-GCM real
  const encrypted = btoa(key);
  const iv = btoa(Math.random().toString(36).substring(7));
  return { encrypted, iv };
}

function decryptAPIKey(encrypted: string, iv: string): string {
  // Por enquanto, apenas decode de base64
  // TODO: Implementar AES-256-GCM real
  try {
    return atob(encrypted);
  } catch {
    return '';
  }
}

// ============================================
// SERVIÇO
// ============================================

export class UserAPIManager {
  
  /**
   * Adicionar nova API key
   */
  async addAPIKey(data: CreateAPIKeyData): Promise<UserAPIKey> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Criptografar a chave
    const { encrypted, iv } = encryptAPIKey(data.api_key);

    // Se marcar como default, desmarcar outras
    if (data.is_default) {
      await supabase
        .from('user_api_keys')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('provider', data.provider);
    }

    const { data: apiKey, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        provider: data.provider,
        api_key_encrypted: encrypted,
        encryption_iv: iv,
        name: data.name,
        is_default: data.is_default ?? false,
        monthly_limit: data.monthly_limit,
        monthly_token_limit: data.monthly_token_limit,
        cost_per_million_tokens: data.cost_per_million_tokens,
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar API key: ${error.message}`);
    return apiKey;
  }

  /**
   * Listar todas as API keys do usuário
   */
  async listAPIKeys(provider?: AIProvider): Promise<UserAPIKey[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    let query = supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao listar API keys: ${error.message}`);
    
    return data || [];
  }

  /**
   * Obter API key específica (descriptografada)
   */
  async getAPIKey(id: string): Promise<{ key: UserAPIKey; decrypted: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      throw new Error(`Erro ao obter API key: ${error?.message}`);
    }

    const decrypted = decryptAPIKey(data.api_key_encrypted, data.encryption_iv);

    return { key: data, decrypted };
  }

  /**
   * Obter API key padrão para um provider (descriptografada)
   */
  async getDefaultAPIKey(provider: AIProvider): Promise<{ key: UserAPIKey; decrypted: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Tentar pegar a default
    let { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    // Se não tem default, pega a primeira ativa
    if (error || !data) {
      const result = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error || !data) return null;

    const decrypted = decryptAPIKey(data.api_key_encrypted, data.encryption_iv);
    return { key: data, decrypted };
  }

  /**
   * Atualizar API key
   */
  async updateAPIKey(id: string, updates: UpdateAPIKeyData): Promise<UserAPIKey> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Se marcar como default, desmarcar outras
    if (updates.is_default) {
      // Primeiro, pegar o provider desta key
      const { data: currentKey } = await supabase
        .from('user_api_keys')
        .select('provider')
        .eq('id', id)
        .single();

      if (currentKey) {
        await supabase
          .from('user_api_keys')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('provider', currentKey.provider);
      }
    }

    const { data, error } = await supabase
      .from('user_api_keys')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar API key: ${error.message}`);
    return data;
  }

  /**
   * Deletar API key
   */
  async deleteAPIKey(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Erro ao deletar API key: ${error.message}`);
  }

  /**
   * Ativar/Desativar API key
   */
  async toggleAPIKey(id: string, is_active: boolean): Promise<UserAPIKey> {
    return this.updateAPIKey(id, { is_active });
  }

  /**
   * Incrementar uso de uma API key
   */
  async incrementUsage(id: string, tokensUsed: number = 0): Promise<void> {
    const { error } = await supabase.rpc('increment_api_key_usage', {
      p_api_key_id: id,
      p_tokens_used: tokensUsed
    });

    if (error) {
      console.error('Erro ao incrementar uso:', error);
    }
  }

  /**
   * Registrar uso detalhado
   */
  async logUsage(
    apiKeyId: string,
    provider: AIProvider,
    tokensUsed: number,
    requestType: string,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_api_usage_logs').insert({
      user_id: user.id,
      api_key_id: apiKeyId,
      provider,
      tokens_used: tokensUsed,
      request_type: requestType,
      success,
      error_message: errorMessage,
      metadata: metadata || {}
    });

    // Incrementar contador
    await this.incrementUsage(apiKeyId, tokensUsed);
  }

  /**
   * Obter estatísticas de uso do usuário
   */
  async getStats(): Promise<APIKeyStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_user_api_stats', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Erro ao obter estatísticas:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Rotacionar para próxima API key ativa
   * Útil quando uma API atinge limite ou falha
   */
  async rotateToNextKey(provider: AIProvider, currentKeyId: string): Promise<{ key: UserAPIKey; decrypted: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('get_next_active_api_key', {
      p_user_id: user.id,
      p_provider: provider,
      p_current_key_id: currentKeyId
    });

    if (error || !data || data.length === 0) return null;

    const nextKey = data[0];
    const decrypted = decryptAPIKey(nextKey.api_key_encrypted, nextKey.encryption_iv);

    return { key: nextKey, decrypted };
  }

  /**
   * Verificar se API key atingiu limite mensal
   */
  async hasReachedLimit(id: string): Promise<{ reached: boolean; type?: 'requests' | 'tokens' }> {
    const { key } = await this.getAPIKey(id);

    if (key.monthly_limit && key.usage_count >= key.monthly_limit) {
      return { reached: true, type: 'requests' };
    }

    if (key.monthly_token_limit && key.tokens_used >= key.monthly_token_limit) {
      return { reached: true, type: 'tokens' };
    }

    return { reached: false };
  }

  /**
   * Obter API key com rotação automática se necessário
   * Esta é a função principal que deve ser usada ao fazer requisições
   */
  async getAPIKeyWithRotation(provider: AIProvider): Promise<{ key: UserAPIKey; decrypted: string } | null> {
    // Tentar pegar a API key padrão
    let result = await this.getDefaultAPIKey(provider);
    
    if (!result) return null;

    // Verificar se atingiu limite
    const limitCheck = await this.hasReachedLimit(result.key.id);
    
    if (limitCheck.reached) {
      console.warn(`API key ${result.key.name} atingiu limite de ${limitCheck.type}. Rotacionando...`);
      
      // Tentar rotacionar para próxima
      const rotated = await this.rotateToNextKey(provider, result.key.id);
      
      if (rotated) {
        console.log(`Rotacionado para API key: ${rotated.key.name}`);
        return rotated;
      } else {
        console.error(`Nenhuma API key disponível para ${provider}`);
        return null;
      }
    }

    return result;
  }
}

// Exportar instância singleton
export const userAPIManager = new UserAPIManager();
