/**
 * Página de Gerenciamento de API Keys
 * Mobile-first, design profissional
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header mobile-first */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔑 API Keys</h1>
          
          {/* Seletor de instituição */}
          {institutions.length > 1 && (
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
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
            className="w-full mb-4 py-4 bg-blue-500 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar API Key
          </button>
        )}

        {/* Formulário de adicionar */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Nova API Key</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de provider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provedor de IA
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(AI_PROVIDERS).map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} {provider.isFree && '(Gratuito)'} {provider.recommended && '⭐'}
                  </option>
                ))}
              </select>

              {/* Info do provider */}
              <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
                <p className="text-gray-700 mb-2">{providerInfo.description}</p>
                <div className="flex flex-wrap gap-2">
                  {providerInfo.features.map(feature => (
                    <span key={feature} className="px-2 py-1 bg-white rounded-lg text-xs text-gray-600">
                      {feature}
                    </span>
                  ))}
                </div>
                <a
                  href={providerInfo.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-500 hover:underline text-sm font-medium"
                >
                  Obter API Key →
                </a>
              </div>
            </div>

            {/* Nome */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Key
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ex: Qwen Production"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Cole sua API key aqui..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddKey}
                disabled={saving}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de API keys */}
        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Key className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma API key configurada</p>
              <p className="text-sm">Adicione uma para começar</p>
            </div>
          ) : (
            apiKeys.map(key => (
              <div key={key.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      {key.isDefault && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Padrão
                        </span>
                      )}
                      {!key.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {AI_PROVIDERS[key.provider as AIProvider]?.name || key.provider}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                  <span>Uso: {key.usageCount || 0}x</span>
                  {key.lastUsedAt && (
                    <span>Último uso: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Botão testar */}
                <button
                  onClick={() => handleTestKey(key.id)}
                  className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-100"
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
