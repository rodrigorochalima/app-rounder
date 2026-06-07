/**
 * Serviço de Gestão Multi-Usuário de API Keys
 * Usa a API REST própria com Neon PostgreSQL (sem Supabase)
 */
import { apiKeysAPI } from '@/lib/api';

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
  encrypted_key: string;
  encryption_iv: string;
  name?: string;
  is_active: boolean;
  is_default: boolean;
  current_month_usage: number;
  last_used_at?: string;
  monthly_limit?: number;
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
  last_used?: string;
}

export interface CreateAPIKeyData {
  provider: AIProvider;
  api_key: string;
  name?: string;
  is_default?: boolean;
  monthly_limit?: number;
  cost_per_million_tokens?: number;
  notes?: string;
}

export interface UpdateAPIKeyData {
  name?: string;
  is_active?: boolean;
  is_default?: boolean;
  monthly_limit?: number;
  notes?: string;
}

// ============================================
// CRIPTOGRAFIA (base64 simples)
// ============================================
function encryptAPIKey(key: string): { encrypted: string; iv: string } {
  const encrypted = btoa(unescape(encodeURIComponent(key)));
  const iv = btoa(Math.random().toString(36).substring(7));
  return { encrypted, iv };
}

function decryptAPIKey(encrypted: string, _iv: string): string {
  try {
    return decodeURIComponent(escape(atob(encrypted)));
  } catch {
    try { return atob(encrypted); } catch { return ''; }
  }
}

// ============================================
// CLASSE PRINCIPAL
// ============================================
export class UserAPIManager {

  async addAPIKey(data: CreateAPIKeyData): Promise<UserAPIKey> {
    const { encrypted, iv } = encryptAPIKey(data.api_key);
    const result = await apiKeysAPI.create({
      provider: data.provider,
      name: data.name || `${data.provider} Key`,
      encrypted_key: encrypted,
      encryption_iv: iv,
      monthly_limit: data.monthly_limit || 1000,
      cost_per_million_tokens: data.cost_per_million_tokens || 0,
      notes: data.notes || '',
    });
    return result.data;
  }

  async listAPIKeys(provider?: AIProvider): Promise<UserAPIKey[]> {
    const result = await apiKeysAPI.list();
    const keys: UserAPIKey[] = result.data || [];
    if (provider) return keys.filter(k => k.provider === provider);
    return keys;
  }

  async getAPIKey(id: string): Promise<{ key: UserAPIKey; decrypted: string }> {
    const keys = await this.listAPIKeys();
    const key = keys.find(k => k.id === id);
    if (!key) throw new Error('API key não encontrada');
    const decrypted = decryptAPIKey(key.encrypted_key, key.encryption_iv);
    return { key, decrypted };
  }

  async getDefaultAPIKey(provider: AIProvider): Promise<{ key: UserAPIKey; decrypted: string } | null> {
    const keys = await this.listAPIKeys(provider);
    const activeKeys = keys.filter(k => k.is_active);
    if (activeKeys.length === 0) return null;
    const defaultKey = activeKeys.find(k => k.is_default) || activeKeys[0];
    const decrypted = decryptAPIKey(defaultKey.encrypted_key, defaultKey.encryption_iv);
    return { key: defaultKey, decrypted };
  }

  async updateAPIKey(id: string, updates: UpdateAPIKeyData): Promise<UserAPIKey> {
    const result = await apiKeysAPI.update(id, updates);
    return result.data;
  }

  async deleteAPIKey(id: string): Promise<void> {
    await apiKeysAPI.delete(id);
  }

  async toggleAPIKey(id: string, is_active: boolean): Promise<UserAPIKey> {
    return this.updateAPIKey(id, { is_active });
  }

  async getStats(): Promise<APIKeyStats[]> {
    const keys = await this.listAPIKeys();
    const statsMap = new Map<string, APIKeyStats>();
    for (const key of keys) {
      const existing = statsMap.get(key.provider);
      if (existing) {
        existing.total_keys++;
        if (key.is_active) existing.active_keys++;
        existing.total_usage += key.current_month_usage || 0;
        if (key.last_used_at && (!existing.last_used || key.last_used_at > existing.last_used)) {
          existing.last_used = key.last_used_at;
        }
      } else {
        statsMap.set(key.provider, {
          provider: key.provider,
          total_keys: 1,
          active_keys: key.is_active ? 1 : 0,
          total_usage: key.current_month_usage || 0,
          last_used: key.last_used_at,
        });
      }
    }
    return Array.from(statsMap.values());
  }

  async getAPIKeyWithRotation(provider: AIProvider): Promise<{ key: UserAPIKey; decrypted: string } | null> {
    return this.getDefaultAPIKey(provider);
  }

  async hasReachedLimit(id: string): Promise<{ reached: boolean; type?: 'requests' }> {
    const { key } = await this.getAPIKey(id);
    if (key.monthly_limit && (key.current_month_usage || 0) >= key.monthly_limit) {
      return { reached: true, type: 'requests' };
    }
    return { reached: false };
  }
}

export const userAPIManager = new UserAPIManager();
