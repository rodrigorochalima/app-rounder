/**
 * Cliente de API - App Rounder
 * Substitui o cliente Supabase por chamadas REST à nossa própria API
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================
// GERENCIAMENTO DE TOKEN
// ============================================================

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

export function setTokens(accessToken: string, refreshToken: string, remember = true) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('access_token', accessToken);
  storage.setItem('refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
}

// ============================================================
// CLIENTE HTTP BASE
// ============================================================

async function request<T>(
  method: string,
  path: string,
  body?: any,
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = getAccessToken();
    if (!token) throw new Error('Não autenticado');
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expirado - tentar renovar
  if (response.status === 403 && requireAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${retry.status}`);
      }
      return retry.json();
    } else {
      clearTokens();
      window.location.href = '/auth';
      throw new Error('Sessão expirada');
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `Erro ${response.status}`);
  }

  return response.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const remember = !!localStorage.getItem('refresh_token');
    setTokens(data.accessToken, refreshToken, remember);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// API DE AUTENTICAÇÃO
// ============================================================

export const authAPI = {
  async signup(email: string, password: string, fullName?: string) {
    return request<any>('POST', '/api/auth/signup', { email, password, fullName }, false);
  },

  async login(email: string, password: string) {
    return request<any>('POST', '/api/auth/login', { email, password }, false);
  },

  async logout(refreshToken?: string) {
    try {
      await request<any>('POST', '/api/auth/logout', { refreshToken });
    } catch {
      // Ignorar erros no logout
    }
    clearTokens();
  },

  async me() {
    return request<any>('GET', '/api/auth/me');
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    return request<any>('PUT', '/api/auth/update-password', { currentPassword, newPassword });
  },

  async resetPassword(email: string) {
    return request<any>('POST', '/api/auth/reset-password', { email }, false);
  },
};

// ============================================================
// API DE PERFIL
// ============================================================

export const profileAPI = {
  async update(updates: any) {
    return request<any>('PUT', '/api/profile', updates);
  },
};

// ============================================================
// API DE API KEYS
// ============================================================

export const apiKeysAPI = {
  async list() {
    return request<any>('GET', '/api/api-keys');
  },

  async create(data: any) {
    return request<any>('POST', '/api/api-keys', data);
  },

  async update(id: string, data: any) {
    return request<any>('PUT', `/api/api-keys/${id}`, data);
  },

  async delete(id: string) {
    return request<any>('DELETE', `/api/api-keys/${id}`);
  },
};

// ============================================================
// API DE REGRAS DE ROUND
// ============================================================

export const roundRulesAPI = {
  async list() {
    return request<any>('GET', '/api/round-rules');
  },

  async create(data: any) {
    return request<any>('POST', '/api/round-rules', data);
  },

  async update(id: string, data: any) {
    return request<any>('PUT', `/api/round-rules/${id}`, data);
  },

  async delete(id: string) {
    return request<any>('DELETE', `/api/round-rules/${id}`);
  },

  async reorder(rules: { id: string; order_index: number }[]) {
    return request<any>('PATCH', '/api/round-rules/reorder', { rules });
  },
};

// ============================================================
// API DE MÉTRICAS DE USO DE LLM
// ============================================================

export const llmMetricsAPI = {
  async getMetrics() {
    return request<any>('GET', '/api/llm-metrics');
  },
  async registerUsage(data: {
    provider: string;
    api_key_id?: string;
    tokens_used?: number;
    cost_usd?: number;
    duration_ms?: number;
    model_used?: string;
    success?: boolean;
    error_message?: string;
  }) {
    return request<any>('POST', '/api/llm-usage', data);
  },
};

// ============================================================
// API DE BALANCEAMENTO DE LLM
// ============================================================

export const llmBalanceAPI = {
  async getConfig() {
    return request<any>('GET', '/api/llm-balance');
  },
  async updateConfig(data: {
    strategy?: string;
    priority_order?: string[];
    fallback_enabled?: boolean;
    cost_threshold_usd?: number;
  }) {
    return request<any>('PUT', '/api/llm-balance', data);
  },
};

// ============================================================
// HEALTH CHECK
// ============================================================

export async function healthCheck() {
  return request<any>('GET', '/api/health', undefined, false);
}
