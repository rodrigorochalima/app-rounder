import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  getInstitutions,
  getApiKeysDecrypted,
  saveApiKey,
  toggleApiKey,
  deleteApiKey,
  testApiKey,
  getApiKeysStats,
  type Institution,
  type ApiKeyDecrypted
} from '../lib/api-keys-service';

const ADMIN_PASSWORD = 'app-rounder-admin-2025'; // Em produção, usar hash e Supabase

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyDecrypted[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, totalUsage: 0 });

  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState({
    provider: 'qwen',
    key: '',
    name: ''
  });

  const [testResults, setTestResults] = useState<{ [keyId: string]: { success: boolean; message: string } }>({});
  const [loading, setLoading] = useState(false);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  // Carregar dados quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Carregar API keys quando instituição selecionada
  useEffect(() => {
    if (selectedInstitution) {
      loadApiKeys();
    }
  }, [selectedInstitution]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setLoginError('');
    } else {
      setLoginError('Senha incorreta');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    setPassword('');
  };

  const loadData = async () => {
    try {
      const insts = await getInstitutions();
      setInstitutions(insts);
      if (insts.length > 0 && !selectedInstitution) {
        setSelectedInstitution(insts[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const loadApiKeys = async () => {
    if (!selectedInstitution) return;
    
    setLoading(true);
    try {
      const keys = await getApiKeysDecrypted(selectedInstitution.id);
      setApiKeys(keys);
      
      const statistics = await getApiKeysStats(selectedInstitution.id);
      setStats(statistics);
    } catch (error) {
      console.error('Erro ao carregar API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution) return;

    setLoading(true);
    try {
      await saveApiKey(
        selectedInstitution.id,
        newKey.provider,
        newKey.key,
        newKey.name || undefined
      );
      
      setNewKey({ provider: 'qwen', key: '', name: '' });
      setShowAddKey(false);
      await loadApiKeys();
      alert('API Key salva com sucesso!');
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKey = async (keyId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await toggleApiKey(keyId, !currentStatus);
      await loadApiKeys();
    } catch (error) {
      alert('Erro ao alterar status da chave');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta API key?')) return;

    setLoading(true);
    try {
      await deleteApiKey(keyId);
      await loadApiKeys();
    } catch (error) {
      alert('Erro ao deletar chave');
    } finally {
      setLoading(false);
    }
  };

  const handleTestKey = async (keyId: string, provider: string) => {
    if (!selectedInstitution) return;

    setLoading(true);
    try {
      const result = await testApiKey(selectedInstitution.id, provider);
      setTestResults({ ...testResults, [keyId]: result });
    } catch (error) {
      setTestResults({ ...testResults, [keyId]: { success: false, message: 'Erro ao testar' } });
    } finally {
      setLoading(false);
    }
  };

  // Tela de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Painel Admin</h1>
            <p className="text-gray-600">App-Rounder - Gerenciamento de API Keys</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Administrador
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite a senha"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Entrar
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation('/')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Voltar para o app
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Painel administrativo
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔐 Painel Administrativo</h1>
              <p className="text-sm text-gray-600 mt-1">Gerenciamento de API Keys e Configurações</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation('/')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                ← Voltar ao App
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seletor de Instituição */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instituição
          </label>
          <select
            value={selectedInstitution?.id || ''}
            onChange={(e) => {
              const inst = institutions.find(i => i.id === e.target.value);
              setSelectedInstitution(inst || null);
            }}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>
                {inst.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total de Keys</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Ativas</div>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Inativas</div>
            <div className="text-3xl font-bold text-gray-400">{stats.inactive}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Uso Total</div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalUsage}</div>
          </div>
        </div>

        {/* Lista de API Keys */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
            <button
              onClick={() => setShowAddKey(!showAddKey)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              {showAddKey ? 'Cancelar' : '+ Adicionar Key'}
            </button>
          </div>

          {/* Formulário de Nova Key */}
          {showAddKey && (
            <form onSubmit={handleSaveKey} className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Nova API Key</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provedor
                  </label>
                  <select
                    value={newKey.provider}
                    onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="qwen">Qwen (Alibaba)</option>
                    <option value="cerebras">Cerebras</option>
                    <option value="groq">Groq</option>
                    <option value="gemini">Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome (opcional)
                  </label>
                  <input
                    type="text"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    placeholder="Ex: Qwen Production"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {/* Tabela de Keys */}
          {loading && apiKeys.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma API key cadastrada. Clique em "Adicionar Key" para começar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Provedor</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Key</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Uso</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900 uppercase">{key.provider}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{key.key_name || '-'}</td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{key.key_masked}</code>
                      </td>
                      <td className="py-3 px-4">
                        {key.active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                            Ativa
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{key.usage_count}x</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestKey(key.id, key.provider)}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded"
                            disabled={loading}
                          >
                            Testar
                          </button>
                          <button
                            onClick={() => handleToggleKey(key.id, key.active)}
                            className={`px-3 py-1 text-sm rounded ${
                              key.active
                                ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                                : 'bg-green-100 hover:bg-green-200 text-green-700'
                            }`}
                            disabled={loading}
                          >
                            {key.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded"
                            disabled={loading}
                          >
                            Deletar
                          </button>
                        </div>
                        {testResults[key.id] && (
                          <div className={`mt-2 text-xs ${testResults[key.id].success ? 'text-green-600' : 'text-red-600'}`}>
                            {testResults[key.id].message}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
