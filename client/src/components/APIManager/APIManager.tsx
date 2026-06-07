/**
 * Dashboard de Gestão de APIs - v2.0
 * Inclui: Tutorial, Link Direto, Barras de Progresso, Extrato, Balanceamento Inteligente
 */
import { useState, useEffect } from 'react';
import { userAPIManager, type UserAPIKey, type AIProvider } from '@/services/user-api-manager.service';
import { llmMetricsAPI, llmBalanceAPI } from '@/lib/api';
import './APIManager.css';

interface APIManagerProps {
  onClose: () => void;
}

interface ProviderConfig {
  id: AIProvider;
  name: string;
  icon: string;
  isFree: boolean;
  model: string;
  costPerMillion: number;
  createApiUrl: string;
  tutorial: { steps: string[]; tips: string[] };
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'cerebras', name: 'Cerebras', icon: '🧠', isFree: true, model: 'llama-3.3-70b', costPerMillion: 0,
    createApiUrl: 'https://cloud.cerebras.ai/platform',
    tutorial: {
      steps: ['Acesse cloud.cerebras.ai e crie uma conta gratuita','No painel, clique em "API Keys" no menu lateral','Clique em "Create new API Key"','Copie a chave gerada (começa com "csk-...")','Cole aqui no campo API Key'],
      tips: ['Plano gratuito: 30 req/min, 60k tokens/min','Modelo recomendado: llama-3.3-70b (mais rápido)','Ideal para processamento principal dos rounds'],
    },
  },
  {
    id: 'groq', name: 'Groq', icon: '⚡', isFree: true, model: 'llama-3.3-70b-versatile', costPerMillion: 0,
    createApiUrl: 'https://console.groq.com/keys',
    tutorial: {
      steps: ['Acesse console.groq.com e crie uma conta gratuita','No menu lateral, clique em "API Keys"','Clique em "Create API Key"','Dê um nome (ex: "App Rounder") e confirme','Copie a chave (começa com "gsk_...")'],
      tips: ['Plano gratuito: 30 req/min, 6k req/dia','Velocidade excepcional (mais rápido do mercado)','Ótimo como fallback do Cerebras'],
    },
  },
  {
    id: 'gemini', name: 'Google Gemini', icon: '✨', isFree: true, model: 'gemini-1.5-flash', costPerMillion: 0,
    createApiUrl: 'https://aistudio.google.com/app/apikey',
    tutorial: {
      steps: ['Acesse aistudio.google.com com sua conta Google','Clique em "Get API Key" no menu lateral','Clique em "Create API key in new project"','Copie a chave gerada (começa com "AIza...")','Cole aqui no campo API Key'],
      tips: ['Plano gratuito: 15 req/min, 1M tokens/min','Modelo Flash: rápido e eficiente','Excelente para validação de documentos'],
    },
  },
  {
    id: 'qwen', name: 'Alibaba Qwen', icon: '🚀', isFree: true, model: 'qwen-turbo', costPerMillion: 0,
    createApiUrl: 'https://dashscope.aliyuncs.com',
    tutorial: {
      steps: ['Acesse dashscope.aliyuncs.com e crie uma conta','Ative o serviço DashScope na sua conta','Acesse "API Key Management" no painel','Crie uma nova API Key','Copie a chave gerada'],
      tips: ['Plano gratuito generoso para novos usuários','Modelo Qwen-Turbo: custo-benefício excelente','Bom para tarefas de processamento de texto'],
    },
  },
  {
    id: 'deepseek', name: 'DeepSeek', icon: '🔍', isFree: true, model: 'deepseek-chat', costPerMillion: 0.14,
    createApiUrl: 'https://platform.deepseek.com/api_keys',
    tutorial: {
      steps: ['Acesse platform.deepseek.com e crie uma conta','No painel, clique em "API Keys"','Clique em "Create new API key"','Copie a chave gerada (começa com "sk-...")','Cole aqui no campo API Key'],
      tips: ['Crédito gratuito de $5 para novos usuários','Preço: $0.14/1M tokens (muito barato)','Excelente para validação médica detalhada'],
    },
  },
  {
    id: 'openai', name: 'OpenAI', icon: '🤖', isFree: false, model: 'gpt-4o-mini', costPerMillion: 0.15,
    createApiUrl: 'https://platform.openai.com/api-keys',
    tutorial: {
      steps: ['Acesse platform.openai.com e faça login','Clique no ícone de engrenagem → "API Keys"','Clique em "Create new secret key"','Copie a chave (começa com "sk-...")','Adicione créditos em "Billing" para usar'],
      tips: ['Pago: a partir de $0.15/1M tokens (gpt-4o-mini)','Modelo mais preciso disponível','Use como último recurso (mais caro)'],
    },
  },
  {
    id: 'cohere', name: 'Cohere', icon: '🔮', isFree: false, model: 'command-r', costPerMillion: 0.5,
    createApiUrl: 'https://dashboard.cohere.com/api-keys',
    tutorial: {
      steps: ['Acesse dashboard.cohere.com e crie uma conta','No menu lateral, clique em "API Keys"','Copie a chave de trial ou crie uma nova','Cole aqui no campo API Key'],
      tips: ['Trial gratuito disponível (uso limitado)','Bom para tarefas de análise de texto'],
    },
  },
  {
    id: 'mistral', name: 'Mistral AI', icon: '🌪️', isFree: false, model: 'mistral-small', costPerMillion: 0.2,
    createApiUrl: 'https://console.mistral.ai/api-keys',
    tutorial: {
      steps: ['Acesse console.mistral.ai e crie uma conta','No menu, clique em "API Keys"','Clique em "Create new key"','Copie a chave gerada','Cole aqui no campo API Key'],
      tips: ['Preço: $0.20/1M tokens (mistral-small)','Boa relação custo-benefício','Alternativa europeia ao OpenAI'],
    },
  },
];

interface LLMMetrics {
  by_provider: { provider: string; total_requests: number; total_tokens: number; total_cost: number; avg_duration_ms: number; successful_requests: number; last_used: string }[];
  global: { total_requests: number; total_tokens: number; total_cost: number; successful_requests: number };
  extract: { provider: string; tokens_used: number; cost_usd: number; duration_ms: number; model_used: string; success: boolean; error_message?: string; created_at: string }[];
  api_keys: { id: string; provider: string; name: string; is_active: boolean; is_default: boolean; current_month_usage: number; monthly_limit: number; total_tokens_used: number; total_cost_usd: number; usage_count: number; last_used_at: string }[];
}

interface BalanceConfig {
  strategy: string;
  priority_order: string[];
  fallback_enabled: boolean;
  cost_threshold_usd: number;
}

type ActiveTab = 'apis' | 'metrics' | 'balance' | 'extract';

export default function APIManager({ onClose }: APIManagerProps) {
  const [apiKeys, setAPIKeys] = useState<UserAPIKey[]>([]);
  const [metrics, setMetrics] = useState<LLMMetrics | null>(null);
  const [balanceConfig, setBalanceConfig] = useState<BalanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('apis');
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);
  const [tutorialProvider, setTutorialProvider] = useState<AIProvider | null>(null);
  const [formData, setFormData] = useState({ api_key: '', name: '', is_default: false, monthly_limit: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keys, metricsData, balanceData] = await Promise.all([
        userAPIManager.listAPIKeys(),
        llmMetricsAPI.getMetrics().catch(() => null),
        llmBalanceAPI.getConfig().catch(() => null),
      ]);
      setAPIKeys(keys);
      if (metricsData) setMetrics(metricsData);
      if (balanceData?.data) setBalanceConfig(balanceData.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try { await userAPIManager.toggleAPIKey(id, !currentState); await loadData(); }
    catch { alert('Erro ao alternar API'); }
  };

  const handleSetDefault = async (id: string) => {
    try { await userAPIManager.updateAPIKey(id, { is_default: true }); await loadData(); }
    catch { alert('Erro ao definir padrão'); }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!confirm(`Tem certeza que deseja deletar a API "${name || 'sem nome'}"?`)) return;
    try { await userAPIManager.deleteAPIKey(id); await loadData(); }
    catch { alert('Erro ao deletar API'); }
  };

  const handleAddClick = (provider: AIProvider) => {
    if (expandedProvider === provider) { setExpandedProvider(null); resetForm(); }
    else { setExpandedProvider(provider); setTutorialProvider(null); resetForm(); }
  };

  const resetForm = () => setFormData({ api_key: '', name: '', is_default: false, monthly_limit: '', notes: '' });

  const handleSubmit = async (e: React.FormEvent, provider: AIProvider) => {
    e.preventDefault();
    if (!formData.api_key.trim()) { alert('Por favor, insira a API key'); return; }
    setSaving(true);
    try {
      await userAPIManager.addAPIKey({ provider, api_key: formData.api_key, name: formData.name || undefined, is_default: formData.is_default, monthly_limit: formData.monthly_limit ? parseInt(formData.monthly_limit) : undefined, notes: formData.notes || undefined });
      setExpandedProvider(null); resetForm(); await loadData();
    } catch (error: any) {
      alert('Erro ao adicionar API: ' + error.message);
    } finally { setSaving(false); }
  };

  const handleSaveBalance = async () => {
    if (!balanceConfig) return;
    setSavingBalance(true);
    try { await llmBalanceAPI.updateConfig(balanceConfig); alert('Configuração de balanceamento salva!'); }
    catch { alert('Erro ao salvar configuração'); }
    finally { setSavingBalance(false); }
  };

  const formatNumber = (num: number | string) => new Intl.NumberFormat('pt-BR').format(Number(num) || 0);
  const formatCost = (usd: number | string) => { const v = Number(usd) || 0; if (v === 0) return 'Grátis'; if (v < 0.01) return `$${v.toFixed(6)}`; return `$${v.toFixed(4)}`; };
  const formatDate = (date?: string) => { if (!date) return 'Nunca'; return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const formatDuration = (ms: number) => { if (!ms) return '-'; if (ms < 1000) return `${ms}ms`; return `${(ms / 1000).toFixed(1)}s`; };
  const getUsagePercent = (key: UserAPIKey) => { if (!key.monthly_limit || key.monthly_limit === 0) return 0; return Math.min(Math.round((key.current_month_usage / key.monthly_limit) * 100), 100); };
  const getUsageColor = (p: number) => p >= 90 ? '#ef4444' : p >= 70 ? '#f59e0b' : '#10b981';
  const getProviderConfig = (id: string) => PROVIDERS.find(p => p.id === id) || PROVIDERS[0];
  const getMetricsForProvider = (provider: string) => metrics?.by_provider.find(m => m.provider === provider);
  const getTotalTokensForProvider = (provider: string) => metrics?.api_keys.filter(k => k.provider === provider).reduce((sum, k) => sum + (Number(k.total_tokens_used) || 0), 0) || 0;

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content api-manager-modal">
          <div className="loading-state"><div className="loading-spinner" /><p>Carregando dados...</p></div>
        </div>
      </div>
    );
  }

  const globalMetrics = metrics?.global;
  const totalAPIs = apiKeys.length;
  const activeAPIs = apiKeys.filter(k => k.is_active).length;
  const totalCost = Number(globalMetrics?.total_cost) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-manager-modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>🔑 Gerenciar APIs</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* RESUMO GLOBAL */}
        <div className="global-summary">
          <div className="summary-card">
            <span className="summary-icon">📊</span>
            <div><div className="summary-label">APIs Configuradas</div><div className="summary-value">{activeAPIs}/{totalAPIs}</div></div>
          </div>
          <div className="summary-card">
            <span className="summary-icon">🔄</span>
            <div><div className="summary-label">Requisições (mês)</div><div className="summary-value">{formatNumber(globalMetrics?.total_requests || 0)}</div></div>
          </div>
          <div className="summary-card">
            <span className="summary-icon">🪙</span>
            <div><div className="summary-label">Tokens (mês)</div><div className="summary-value">{formatNumber(globalMetrics?.total_tokens || 0)}</div></div>
          </div>
          <div className="summary-card" style={{ background: totalCost > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined }}>
            <span className="summary-icon">💰</span>
            <div><div className="summary-label">Custo (mês)</div><div className="summary-value">{formatCost(totalCost)}</div></div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs-nav">
          <button className={`tab-btn ${activeTab === 'apis' ? 'active' : ''}`} onClick={() => setActiveTab('apis')}>🔑 APIs</button>
          <button className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>📈 Progresso</button>
          <button className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>⚖️ Balanceamento</button>
          <button className={`tab-btn ${activeTab === 'extract' ? 'active' : ''}`} onClick={() => setActiveTab('extract')}>📋 Extrato</button>
        </div>

        <div className="tab-content">

          {/* ===== ABA: APIs ===== */}
          {activeTab === 'apis' && (
            <div className="apis-tab">
              {PROVIDERS.map(provider => {
                const providerKeys = apiKeys.filter(k => k.provider === provider.id);
                const isExpanded = expandedProvider === provider.id;
                const showTutorial = tutorialProvider === provider.id;
                const providerMetrics = getMetricsForProvider(provider.id);

                return (
                  <div key={provider.id} className={`provider-section ${providerKeys.length > 0 ? 'has-keys' : ''}`}>
                    <div className="provider-header">
                      <div className="provider-title">
                        <span className="provider-icon">{provider.icon}</span>
                        <div>
                          <span className="provider-name">{provider.name}</span>
                          <span className="provider-model">{provider.model}</span>
                        </div>
                        {provider.isFree ? <span className="badge-free">Grátis</span> : <span className="badge-paid">${provider.costPerMillion}/1M tokens</span>}
                      </div>
                      <div className="provider-actions">
                        <button className="btn-tutorial" onClick={() => setTutorialProvider(showTutorial ? null : provider.id)} title="Como criar esta API">
                          {showTutorial ? '✕ Fechar' : '📖 Tutorial'}
                        </button>
                        <a href={provider.createApiUrl} target="_blank" rel="noopener noreferrer" className="btn-create-link" title="Criar API agora">
                          🔗 Criar API
                        </a>
                        <button className={`btn-add-api ${isExpanded ? 'expanded' : ''}`} onClick={() => handleAddClick(provider.id)}>
                          {isExpanded ? '✕ Cancelar' : '+ Adicionar'}
                        </button>
                      </div>
                    </div>

                    {showTutorial && (
                      <div className="tutorial-panel">
                        <div className="tutorial-header">
                          <span>📖 Como criar sua API Key — {provider.name}</span>
                          <a href={provider.createApiUrl} target="_blank" rel="noopener noreferrer" className="tutorial-link">Abrir {provider.name} →</a>
                        </div>
                        <div className="tutorial-steps">
                          {provider.tutorial.steps.map((step, i) => (
                            <div key={i} className="tutorial-step">
                              <span className="step-number">{i + 1}</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                        <div className="tutorial-tips">
                          <strong>💡 Dicas:</strong>
                          <ul>{provider.tutorial.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
                        </div>
                      </div>
                    )}

                    {providerMetrics && (
                      <div className="provider-quick-stats">
                        <span>🔄 {formatNumber(providerMetrics.total_requests)} req</span>
                        <span>🪙 {formatNumber(providerMetrics.total_tokens)} tokens</span>
                        <span>⏱ {formatDuration(Number(providerMetrics.avg_duration_ms))}</span>
                        <span>💰 {formatCost(providerMetrics.total_cost)}</span>
                      </div>
                    )}

                    {isExpanded && (
                      <form onSubmit={(e) => handleSubmit(e, provider.id)} className="add-api-form-inline">
                        <div className="form-group">
                          <label>API Key *</label>
                          <input type="password" value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} placeholder={`Cole sua ${provider.name} API key aqui`} required autoFocus />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Nome (opcional)</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={`Ex: ${provider.name} Principal`} />
                          </div>
                          <div className="form-group">
                            <label>Limite Mensal de Requisições</label>
                            <input type="number" value={formData.monthly_limit} onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })} placeholder="Ex: 500" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Notas (opcional)</label>
                          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações sobre esta API" rows={2} />
                        </div>
                        <div className="form-group checkbox">
                          <label>
                            <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} />
                            Definir como API padrão para {provider.name}
                          </label>
                        </div>
                        <div className="form-actions-inline">
                          <button type="button" className="btn-cancel" onClick={() => handleAddClick(provider.id)}>Cancelar</button>
                          <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar API'}</button>
                        </div>
                      </form>
                    )}

                    {providerKeys.length === 0 && !isExpanded ? (
                      <div className="no-keys">Nenhuma API configurada</div>
                    ) : (
                      <div className="keys-list">
                        {providerKeys.map(key => {
                          const usagePercent = getUsagePercent(key);
                          const usageColor = getUsageColor(usagePercent);
                          return (
                            <div key={key.id} className={`api-key-card ${!key.is_active ? 'inactive' : ''}`}>
                              <div className="key-header">
                                <div className="key-name">
                                  {key.name || 'Sem nome'}
                                  {key.is_default && <span className="default-badge">Padrão</span>}
                                  {!key.is_active && <span className="inactive-badge">Inativa</span>}
                                </div>
                                <div className="key-actions">
                                  <button className={`toggle-btn ${key.is_active ? 'active' : 'inactive'}`} onClick={() => handleToggleActive(key.id, key.is_active)} title={key.is_active ? 'Desativar' : 'Ativar'}>{key.is_active ? '✓' : '○'}</button>
                                  {!key.is_default && <button className="btn-set-default" onClick={() => handleSetDefault(key.id)} title="Definir como padrão">⭐</button>}
                                  <button className="btn-delete" onClick={() => handleDelete(key.id, key.name)} title="Deletar">🗑️</button>
                                </div>
                              </div>
                              {key.monthly_limit ? (
                                <div className="usage-progress">
                                  <div className="progress-labels">
                                    <span>{formatNumber(key.current_month_usage)} req usadas</span>
                                    <span style={{ color: usageColor }}>{usagePercent}%</span>
                                    <span>Limite: {formatNumber(key.monthly_limit)}</span>
                                  </div>
                                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${usagePercent}%`, background: usageColor }} /></div>
                                </div>
                              ) : (
                                <div className="usage-info">
                                  <span>🔄 {formatNumber(key.current_month_usage)} req este mês</span>
                                  {key.last_used_at && <span>🕒 Último uso: {formatDate(key.last_used_at)}</span>}
                                </div>
                              )}
                              {key.notes && <div className="key-notes">📝 {key.notes}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== ABA: PROGRESSO ===== */}
          {activeTab === 'metrics' && (
            <div className="metrics-tab">
              <h3 className="section-title">📈 Progresso de Uso — Mês Atual</h3>
              <div className="collective-progress">
                <div className="collective-header">
                  <span>🌐 Uso Coletivo Total</span>
                  <span>{formatNumber(globalMetrics?.total_requests || 0)} requisições</span>
                </div>
                <div className="collective-bar">
                  {PROVIDERS.map(p => {
                    const pm = getMetricsForProvider(p.id);
                    const total = Number(globalMetrics?.total_requests) || 1;
                    const pct = pm ? Math.round((Number(pm.total_requests) / total) * 100) : 0;
                    if (pct === 0) return null;
                    return (
                      <div key={p.id} className="collective-segment" style={{ width: `${pct}%` }} title={`${p.name}: ${pct}%`}>
                        {pct > 8 && <span>{p.icon} {pct}%</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="collective-legend">
                  {PROVIDERS.map(p => { const pm = getMetricsForProvider(p.id); if (!pm) return null; return <span key={p.id} className="legend-item">{p.icon} {p.name}: {formatNumber(pm.total_requests)}</span>; })}
                </div>
              </div>

              <div className="provider-metrics-list">
                {PROVIDERS.map(provider => {
                  const pm = getMetricsForProvider(provider.id);
                  const providerKeys = apiKeys.filter(k => k.provider === provider.id);
                  const totalTokens = getTotalTokensForProvider(provider.id);
                  const totalCostProvider = metrics?.api_keys.filter(k => k.provider === provider.id).reduce((sum, k) => sum + (Number(k.total_cost_usd) || 0), 0) || 0;
                  return (
                    <div key={provider.id} className="provider-metric-card">
                      <div className="pmc-header">
                        <span className="pmc-icon">{provider.icon}</span>
                        <div className="pmc-info"><span className="pmc-name">{provider.name}</span><span className="pmc-model">{provider.model}</span></div>
                        <div className="pmc-stats">
                          <span className="pmc-stat"><strong>{formatNumber(pm?.total_requests || 0)}</strong> req/mês</span>
                          <span className="pmc-stat"><strong>{formatNumber(totalTokens)}</strong> tokens total</span>
                          <span className="pmc-stat cost"><strong>{formatCost(totalCostProvider)}</strong></span>
                        </div>
                      </div>
                      {providerKeys.map(key => {
                        const usagePercent = getUsagePercent(key);
                        const usageColor = getUsageColor(usagePercent);
                        return (
                          <div key={key.id} className="key-progress-row">
                            <span className="kpr-name">{key.name || 'Sem nome'}</span>
                            <div className="kpr-bar-wrap">
                              <div className="kpr-bar"><div className="kpr-fill" style={{ width: `${key.monthly_limit ? usagePercent : 0}%`, background: usageColor }} /></div>
                              <span className="kpr-text" style={{ color: usageColor }}>
                                {key.monthly_limit ? `${formatNumber(key.current_month_usage)}/${formatNumber(key.monthly_limit)} (${usagePercent}%)` : `${formatNumber(key.current_month_usage)} req`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {providerKeys.length === 0 && <div className="pmc-no-keys">Nenhuma API configurada</div>}
                      {pm && (
                        <div className="pmc-footer">
                          <span>✅ {formatNumber(pm.successful_requests)} sucessos</span>
                          <span>⏱ Média: {formatDuration(Number(pm.avg_duration_ms))}</span>
                          <span>🕒 {formatDate(pm.last_used)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== ABA: BALANCEAMENTO ===== */}
          {activeTab === 'balance' && (
            <div className="balance-tab">
              <h3 className="section-title">⚖️ Balanceamento Inteligente de LLMs</h3>
              <p className="section-desc">Configure como o sistema escolhe qual LLM usar em cada geração, otimizando entre custo, velocidade e disponibilidade.</p>
              {balanceConfig && (
                <>
                  <div className="balance-section">
                    <label className="balance-label">Estratégia de Seleção</label>
                    <div className="strategy-grid">
                      {[
                        { id: 'smart', icon: '🧠', name: 'Inteligente', desc: 'Usa a melhor LLM disponível considerando custo, velocidade e limite de uso' },
                        { id: 'cheapest_first', icon: '💰', name: 'Mais Barata', desc: 'Prioriza sempre a LLM gratuita ou mais barata disponível' },
                        { id: 'fastest_first', icon: '⚡', name: 'Mais Rápida', desc: 'Prioriza Cerebras e Groq pela velocidade superior' },
                        { id: 'round_robin', icon: '🔄', name: 'Rotação', desc: 'Distribui as requisições igualmente entre todas as LLMs ativas' },
                        { id: 'manual', icon: '🎯', name: 'Manual', desc: 'Usa exatamente a ordem de prioridade definida abaixo' },
                      ].map(s => (
                        <div key={s.id} className={`strategy-card ${balanceConfig.strategy === s.id ? 'selected' : ''}`} onClick={() => setBalanceConfig({ ...balanceConfig, strategy: s.id })}>
                          <span className="strategy-icon">{s.icon}</span>
                          <span className="strategy-name">{s.name}</span>
                          <span className="strategy-desc">{s.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="balance-section">
                    <label className="balance-label">Ordem de Prioridade</label>
                    <p className="balance-hint">Clique nas setas para reordenar (primeira = maior prioridade)</p>
                    <div className="priority-list">
                      {(balanceConfig.priority_order || []).map((providerId, index) => {
                        const p = getProviderConfig(providerId);
                        return (
                          <div key={providerId} className="priority-item">
                            <span className="priority-rank">{index + 1}º</span>
                            <span className="priority-icon">{p.icon}</span>
                            <span className="priority-name">{p.name}</span>
                            {p.isFree && <span className="badge-free-sm">Grátis</span>}
                            <div className="priority-move">
                              <button disabled={index === 0} onClick={() => { const arr = [...balanceConfig.priority_order]; [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; setBalanceConfig({ ...balanceConfig, priority_order: arr }); }}>▲</button>
                              <button disabled={index === balanceConfig.priority_order.length - 1} onClick={() => { const arr = [...balanceConfig.priority_order]; [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]]; setBalanceConfig({ ...balanceConfig, priority_order: arr }); }}>▼</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="balance-section">
                    <label className="balance-label">Opções</label>
                    <div className="balance-options">
                      <label className="option-toggle">
                        <input type="checkbox" checked={balanceConfig.fallback_enabled} onChange={(e) => setBalanceConfig({ ...balanceConfig, fallback_enabled: e.target.checked })} />
                        <span>Fallback automático — se uma LLM falhar, tenta a próxima da lista</span>
                      </label>
                      <div className="option-field">
                        <label>Limite de custo por geração (USD)</label>
                        <input type="number" step="0.01" value={balanceConfig.cost_threshold_usd} onChange={(e) => setBalanceConfig({ ...balanceConfig, cost_threshold_usd: parseFloat(e.target.value) })} placeholder="0.10" />
                        <span className="option-hint">Se o custo estimado ultrapassar este valor, usa uma LLM mais barata</span>
                      </div>
                    </div>
                  </div>

                  <button className="btn-save-balance" onClick={handleSaveBalance} disabled={savingBalance}>
                    {savingBalance ? 'Salvando...' : '💾 Salvar Configuração de Balanceamento'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ===== ABA: EXTRATO ===== */}
          {activeTab === 'extract' && (
            <div className="extract-tab">
              <h3 className="section-title">📋 Extrato de Uso</h3>
              <div className="extract-summary">
                <h4>Resumo por Provedor (Mês Atual)</h4>
                <table className="extract-table">
                  <thead>
                    <tr><th>Provedor</th><th>Requisições</th><th>Tokens</th><th>Custo</th><th>Sucesso</th><th>Velocidade Média</th></tr>
                  </thead>
                  <tbody>
                    {metrics?.by_provider && metrics.by_provider.length > 0 ? (
                      metrics.by_provider.map(m => {
                        const p = getProviderConfig(m.provider);
                        const successRate = m.total_requests > 0 ? Math.round((Number(m.successful_requests) / Number(m.total_requests)) * 100) : 0;
                        return (
                          <tr key={m.provider}>
                            <td><span>{p.icon}</span> {p.name}</td>
                            <td>{formatNumber(m.total_requests)}</td>
                            <td>{formatNumber(m.total_tokens)}</td>
                            <td>{formatCost(m.total_cost)}</td>
                            <td><span style={{ color: successRate >= 95 ? '#10b981' : successRate >= 80 ? '#f59e0b' : '#ef4444' }}>{successRate}%</span></td>
                            <td>{formatDuration(Number(m.avg_duration_ms))}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Nenhum uso registrado ainda. Gere um round para ver o extrato.</td></tr>
                    )}
                  </tbody>
                  {metrics?.by_provider && metrics.by_provider.length > 0 && (
                    <tfoot>
                      <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>{formatNumber(globalMetrics?.total_requests || 0)}</strong></td>
                        <td><strong>{formatNumber(globalMetrics?.total_tokens || 0)}</strong></td>
                        <td><strong>{formatCost(totalCost)}</strong></td>
                        <td><strong>{globalMetrics?.total_requests ? Math.round((Number(globalMetrics.successful_requests) / Number(globalMetrics.total_requests)) * 100) : 0}%</strong></td>
                        <td>-</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="extract-history">
                <h4>Histórico Recente (últimas 30 gerações)</h4>
                {metrics?.extract && metrics.extract.length > 0 ? (
                  <div className="history-list">
                    {metrics.extract.map((entry, i) => {
                      const p = getProviderConfig(entry.provider);
                      return (
                        <div key={i} className={`history-item ${!entry.success ? 'error' : ''}`}>
                          <span className="history-icon">{entry.success ? p.icon : '❌'}</span>
                          <div className="history-info"><span className="history-provider">{p.name}</span><span className="history-model">{entry.model_used}</span></div>
                          <div className="history-metrics">
                            <span>{formatNumber(entry.tokens_used)} tokens</span>
                            <span>{formatCost(entry.cost_usd)}</span>
                            <span>{formatDuration(entry.duration_ms)}</span>
                          </div>
                          <span className="history-date">{formatDate(entry.created_at)}</span>
                          {entry.error_message && <span className="history-error" title={entry.error_message}>⚠️</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-history">Nenhuma geração registrada ainda. O histórico aparecerá aqui após o primeiro uso.</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
