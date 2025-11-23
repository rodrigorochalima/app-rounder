/**
 * Página de Gerenciamento de API Keys
 * Mobile-first com paleta de cores do ícone Rounder
 */

import { useState, useEffect } from 'react';
import { Plus, Key, Trash2, Edit, Check, X, Eye, EyeOff, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserInstitutions } from '@/services/institution/institution.service';
import { getAPIKeys, createAPIKey, deleteAPIKey, testAPIKey } from '@/services/api-keys/api-keys.service';
import { AI_PROVIDERS, type AIProvider, type APIKey } from '@/types/api-key.types';
import type { InstitutionWithMembership } from '@/types/institution.types';

export default function APIKeysPage() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<InstitutionWithMembership[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('qwen');
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInstitutions();
  }, []);

  useEffect(() => {
    if (selectedInstitution) {
      loadAPIKeys();
    }
  }, [selectedInstitution]);

  async function loadInstitutions() {
    try {
      const data = await getUserInstitutions();
      setInstitutions(data);
      if (data.length > 0) {
        setSelectedInstitution(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar instituições:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAPIKeys() {
    try {
      const data = await getAPIKeys(selectedInstitution);
      setApiKeys(data);
    } catch (error) {
      console.error('Erro ao carregar API keys:', error);
    }
  }

  async function handleAddKey() {
    if (!keyName || !keyValue) {
      alert('Preencha todos os campos');
      return;
    }

    setSaving(true);
    try {
      await createAPIKey(selectedInstitution, {
        provider: selectedProvider,
        name: keyName,
        key: keyValue,
        costPerMillionTokens: AI_PROVIDERS[selectedProvider].costPerMillionTokens
      });

      setKeyName('');
      setKeyValue('');
      setShowAddForm(false);
      await loadAPIKeys();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm('Tem certeza que deseja deletar esta API key?')) return;

    try {
      await deleteAPIKey(keyId);
      await loadAPIKeys();
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleTestKey(keyId: string) {
    try {
      const success = await testAPIKey(keyId);
      alert(success ? '✅ Conexão OK!' : '❌ Falha na conexão');
    } catch (error: any) {
      alert(`❌ Erro: ${error.message}`);
    }
  }

  const providerInfo = AI_PROVIDERS[selectedProvider];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#A8D8EA] via-[#87CEEB] to-[#5B9BD5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A8D8EA] via-[#87CEEB] to-[#5B9BD5]">
      {/* Header mobile-first */}
      <div className="bg-white/95 backdrop-blur border-b border-[#5B9BD5]/20 sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">🔑 API Keys</h1>
          
          {/* Seletor de instituição */}
          {institutions.length > 1 && (
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#5B9BD5] rounded-2xl focus:ring-2 focus:ring-[#4A90E2] bg-white text-[#2C3E50] font-medium"
            >
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {/* Botão adicionar */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-4 py-4 bg-[#5B9BD5] hover:bg-[#4A90E2] text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar API Key
          </button>
        )}

        {/* Formulário de adicionar */}
        {showAddForm && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2C3E50]">Nova API Key</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Seletor de provider */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                Provedor de IA
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                className="w-full px-4 py-3 border-2 border-[#5B9BD5] rounded-2xl focus:ring-2 focus:ring-[#4A90E2] bg-white text-[#2C3E50] font-medium"
              >
                {Object.values(AI_PROVIDERS).map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {provider.isFree && '(Gratuito)'} {provider.recommended && '⭐'}
                  </option>
                ))}
              </select>

              {/* Info do provider */}
              <div className="mt-3 p-4 bg-[#A8D8EA]/30 rounded-2xl border border-[#5B9BD5]/30">
                <p className="text-[#2C3E50] mb-2 font-medium">{providerInfo.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {providerInfo.features.map(feature => (
                    <span key={feature} className="px-3 py-1 bg-white rounded-xl text-xs text-[#2C3E50] font-medium shadow-sm">
                      {feature}
                    </span>
                  ))}
                </div>
                <a
                  href={providerInfo.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[#5B9BD5] hover:text-[#4A90E2] text-sm font-bold"
                >
                  Obter API Key →
                </a>
              </div>
            </div>

            {/* Nome */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                Nome da Key
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ex: Qwen Production"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent transition-all"
              />
            </div>

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Cole sua API key aqui..."
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5B9BD5] transition-colors"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddKey}
                disabled={saving}
                className="flex-1 py-3 bg-[#4A90E2] hover:bg-[#5B9BD5] text-white rounded-2xl font-bold disabled:opacity-50 transition-all shadow-lg"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de API keys */}
        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <div className="text-center py-16 text-white">
              <Key className="w-20 h-20 mx-auto mb-4 opacity-60" />
              <p className="text-xl font-bold mb-2">Nenhuma API key configurada</p>
              <p className="text-lg opacity-90">Adicione uma para começar</p>
            </div>
          ) : (
            apiKeys.map(key => (
              <div key={key.id} className="bg-white rounded-2xl shadow-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#2C3E50]">{key.name}</h3>
                      {key.isDefault && (
                        <span className="px-2 py-0.5 bg-[#A8D8EA] text-[#2C3E50] text-xs rounded-full font-bold">
                          Padrão
                        </span>
                      )}
                      {!key.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#5B9BD5] font-medium">
                      {AI_PROVIDERS[key.provider as AIProvider]?.name || key.provider}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                  <span className="font-medium">Uso: {key.usageCount || 0}x</span>
                  {key.lastUsedAt && (
                    <span>Último uso: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Botão testar */}
                <button
                  onClick={() => handleTestKey(key.id)}
                  className="w-full py-2 bg-[#A8D8EA]/30 text-[#2C3E50] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#A8D8EA]/50 transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  Testar Conexão
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
