/**
 * Dashboard de Gestão de APIs
 * UX profissional com expansão inline (sem modal dentro de modal)
 */

import { useState, useEffect } from 'react';
import { userAPIManager, type UserAPIKey, type AIProvider, type APIKeyStats } from '@/services/user-api-manager.service';
import './APIManager.css';

interface APIManagerProps {
  onClose: () => void;
}

const PROVIDERS: { id: AIProvider; name: string; icon: string; isFree: boolean }[] = [
  { id: 'qwen', name: 'Alibaba Qwen', icon: '🚀', isFree: true },
  { id: 'gemini', name: 'Google Gemini', icon: '✨', isFree: true },
  { id: 'cerebras', name: 'Cerebras', icon: '🧠', isFree: true },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔍', isFree: true },
  { id: 'groq', name: 'Groq', icon: '⚡', isFree: true },
  { id: 'openai', name: 'OpenAI', icon: '🤖', isFree: false },
  { id: 'cohere', name: 'Cohere', icon: '🔮', isFree: false },
  { id: 'mistral', name: 'Mistral AI', icon: '🌪️', isFree: false },
];

export default function APIManager({ onClose }: APIManagerProps) {
  const [apiKeys, setAPIKeys] = useState<UserAPIKey[]>([]);
  const [stats, setStats] = useState<APIKeyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);
  const [formData, setFormData] = useState({
    api_key: '',
    name: '',
    is_default: false,
    monthly_limit: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keys, statistics] = await Promise.all([
        userAPIManager.listAPIKeys(),
        userAPIManager.getStats()
      ]);
      setAPIKeys(keys);
      setStats(statistics);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await userAPIManager.toggleAPIKey(id, !currentState);
      await loadData();
    } catch (error) {
      console.error('Erro ao alternar API:', error);
      alert('Erro ao alternar API');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await userAPIManager.updateAPIKey(id, { is_default: true });
      await loadData();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      alert('Erro ao definir como padrão');
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!confirm(`Tem certeza que deseja deletar a API "${name || 'sem nome'}"?`)) {
      return;
    }

    try {
      await userAPIManager.deleteAPIKey(id);
      await loadData();
    } catch (error) {
      console.error('Erro ao deletar API:', error);
      alert('Erro ao deletar API');
    }
  };

  const handleAddClick = (provider: AIProvider) => {
    if (expandedProvider === provider) {
      // Fechar se já está aberto
      setExpandedProvider(null);
      resetForm();
    } else {
      // Abrir formulário inline
      setExpandedProvider(provider);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      api_key: '',
      name: '',
      is_default: false,
      monthly_limit: '',
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent, provider: AIProvider) => {
    e.preventDefault();
    
    if (!formData.api_key.trim()) {
      alert('Por favor, insira a API key');
      return;
    }

    setSaving(true);
    try {
      await userAPIManager.addAPIKey({
        provider,
        api_key: formData.api_key,
        name: formData.name || undefined,
        is_default: formData.is_default,
        monthly_limit: formData.monthly_limit ? parseInt(formData.monthly_limit) : undefined,
        notes: formData.notes || undefined
      });
      
      // Fechar formulário e recarregar
      setExpandedProvider(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Erro ao adicionar API:', error);
      alert('Erro ao adicionar API. Verifique se o Supabase está configurado corretamente.');
    } finally {
      setSaving(false);
    }
  };

  const getProviderInfo = (provider: AIProvider) => {
    return PROVIDERS.find(p => p.id === provider) || { name: provider, icon: '🔑', isFree: false };
  };

  const getStatsForProvider = (provider: AIProvider) => {
    return stats.find(s => s.provider === provider);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsagePercentage = (key: UserAPIKey) => {
    if (key.monthly_limit) {
      return Math.round((key.usage_count / key.monthly_limit) * 100);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content api-manager-modal">
          <div className="loading">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 Gerenciar APIs</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="api-manager-content">
          {/* Estatísticas Gerais */}
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-label">Total de APIs</div>
                <div className="stat-value">{apiKeys.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-label">APIs Ativas</div>
                <div className="stat-value">{apiKeys.filter(k => k.is_active).length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-info">
                <div className="stat-label">Uso Total</div>
                <div className="stat-value">{formatNumber(apiKeys.reduce((sum, k) => sum + k.usage_count, 0))}</div>
              </div>
            </div>
          </div>

          {/* Lista de APIs por Provider */}
          <div className="apis-by-provider">
            {PROVIDERS.map(provider => {
              const providerKeys = apiKeys.filter(k => k.provider === provider.id);
              const providerStats = getStatsForProvider(provider.id);
              const isExpanded = expandedProvider === provider.id;

              return (
                <div key={provider.id} className="provider-section">
                  <div className="provider-header">
                    <div className="provider-title">
                      <span className="provider-icon">{provider.icon}</span>
                      <span className="provider-name">{provider.name}</span>
                      {provider.isFree && <span className="free-badge">Grátis</span>}
                    </div>
                    <button 
                      className={`btn-add-api ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => handleAddClick(provider.id)}
                    >
                      {isExpanded ? '✕ Cancelar' : '+ Adicionar'}
                    </button>
                  </div>

                  {providerStats && (
                    <div className="provider-stats">
                      <span>📈 {formatNumber(providerStats.total_usage)} usos</span>
                      <span>🪙 {formatNumber(providerStats.total_tokens)} tokens</span>
                      {providerStats.last_used && (
                        <span>🕒 {formatDate(providerStats.last_used)}</span>
                      )}
                    </div>
                  )}

                  {/* Formulário Inline (expansível) */}
                  {isExpanded && (
                    <form onSubmit={(e) => handleSubmit(e, provider.id)} className="add-api-form-inline">
                      <div className="form-group">
                        <label>API Key *</label>
                        <input
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          placeholder="Cole sua API key aqui"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Nome (opcional)</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Gemini Produção"
                          />
                        </div>

                        <div className="form-group">
                          <label>Limite Mensal (opcional)</label>
                          <input
                            type="number"
                            value={formData.monthly_limit}
                            onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                            placeholder="Ex: 1000"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Notas (opcional)</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Observações sobre esta API"
                          rows={2}
                        />
                      </div>

                      <div className="form-group checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={formData.is_default}
                            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          />
                          Definir como API padrão para este provider
                        </label>
                      </div>

                      <div className="form-actions-inline">
                        <button type="button" className="btn-cancel" onClick={() => handleAddClick(provider.id)}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn-save" disabled={saving}>
                          {saving ? 'Salvando no Supabase...' : 'Salvar API'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de APIs existentes */}
                  {providerKeys.length === 0 && !isExpanded ? (
                    <div className="no-keys">Nenhuma API configurada</div>
                  ) : (
                    <div className="keys-list">
                      {providerKeys.map(key => (
                        <div key={key.id} className={`api-key-card ${!key.is_active ? 'inactive' : ''}`}>
                          <div className="key-header">
                            <div className="key-name">
                              {key.name || 'Sem nome'}
                              {key.is_default && <span className="default-badge">Padrão</span>}
                            </div>
                            <div className="key-actions">
                              <button
                                className={`toggle-btn ${key.is_active ? 'active' : 'inactive'}`}
                                onClick={() => handleToggleActive(key.id, key.is_active)}
                                title={key.is_active ? 'Desativar' : 'Ativar'}
                              >
                                {key.is_active ? '✓' : '○'}
                              </button>
                              {!key.is_default && (
                                <button
                                  className="btn-set-default"
                                  onClick={() => handleSetDefault(key.id)}
                                  title="Definir como padrão"
                                >
                                  ⭐
                                </button>
                              )}
                              <button
                                className="btn-delete"
                                onClick={() => handleDelete(key.id, key.name)}
                                title="Deletar"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div className="key-stats">
                            <div className="key-stat">
                              <span className="stat-label">Usos:</span>
                              <span className="stat-value">{formatNumber(key.usage_count)}</span>
                              {key.monthly_limit && (
                                <span className="stat-limit">/ {formatNumber(key.monthly_limit)}</span>
                              )}
                            </div>
                            <div className="key-stat">
                              <span className="stat-label">Tokens:</span>
                              <span className="stat-value">{formatNumber(key.tokens_used)}</span>
                            </div>
                          </div>

                          {key.monthly_limit && (
                            <div className="usage-bar">
                              <div 
                                className="usage-fill" 
                                style={{ width: `${Math.min(getUsagePercentage(key), 100)}%` }}
                              />
                              <span className="usage-text">{getUsagePercentage(key)}%</span>
                            </div>
                          )}

                          {key.notes && (
                            <div className="key-notes">{key.notes}</div>
                          )}

                          <div className="key-footer">
                            <span className="last-used">
                              Último uso: {formatDate(key.last_used_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
