import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import './APIConfig.css';

interface APIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  signupUrl: string;
  isFree: boolean;
  tutorial: {
    title: string;
    steps: string[];
  };
}

const API_PROVIDERS: APIProvider[] = [
  {
    id: 'qwen',
    name: 'Alibaba Qwen',
    description: 'Maior limite gratuito - Modelo avançado da Alibaba Cloud',
    icon: '🚀',
    signupUrl: 'https://dashscope.console.aliyun.com',
    isFree: true,
    tutorial: {
      title: 'Como obter API Key do Alibaba Qwen',
      steps: [
        '1. Acesse https://dashscope.console.aliyun.com',
        '2. Clique em "Sign Up" (Cadastrar) no canto superior direito',
        '3. Crie uma conta com seu email ou use conta Google',
        '4. Após login, vá em "API Keys" no menu lateral',
        '5. Clique em "Create API Key"',
        '6. Copie a API Key gerada',
        '7. Cole aqui no App Rounder',
        '✅ Pronto! Você tem acesso gratuito com limite generoso'
      ]
    }
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'API de IA ultra-rápida para geração de texto médico',
    icon: '🧠',
    signupUrl: 'https://cloud.cerebras.ai',
    isFree: true,
    tutorial: {
      title: 'Como obter API Key do Cerebras',
      steps: [
        '1. Acesse https://cloud.cerebras.ai',
        '2. Clique em "Sign Up" (Cadastrar)',
        '3. Crie uma conta com email',
        '4. Verifique seu email e faça login',
        '5. No dashboard, vá em "API Keys"',
        '6. Clique em "Generate New API Key"',
        '7. Dê um nome (ex: "Rounder App")',
        '8. Copie a API Key',
        '9. Cole aqui no App Rounder',
        '✅ Pronto! API gratuita e ultra-rápida'
      ]
    }
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Modelo de IA avançado para análise médica profunda',
    icon: '🔍',
    signupUrl: 'https://platform.deepseek.com',
    isFree: true,
    tutorial: {
      title: 'Como obter API Key do DeepSeek',
      steps: [
        '1. Acesse https://platform.deepseek.com',
        '2. Clique em "Sign Up" no topo',
        '3. Cadastre-se com email ou GitHub',
        '4. Faça login na plataforma',
        '5. Vá em "API Keys" no menu',
        '6. Clique em "Create API Key"',
        '7. Copie a chave gerada',
        '8. Cole aqui no App Rounder',
        '✅ Pronto! Modelo gratuito e poderoso'
      ]
    }
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Processamento de IA em alta velocidade',
    icon: '⚡',
    signupUrl: 'https://console.groq.com',
    isFree: true,
    tutorial: {
      title: 'Como obter API Key do Groq',
      steps: [
        '1. Acesse https://console.groq.com',
        '2. Clique em "Sign Up" (Cadastrar)',
        '3. Use email ou conta Google',
        '4. Após login, vá em "API Keys"',
        '5. Clique em "Create API Key"',
        '6. Dê um nome descritivo',
        '7. Copie a chave',
        '8. Cole aqui no App Rounder',
        '✅ Pronto! Velocidade extrema gratuita'
      ]
    }
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 e modelos avançados (pago)',
    icon: '🤖',
    signupUrl: 'https://platform.openai.com/signup',
    isFree: false,
    tutorial: {
      title: 'Como obter API Key da OpenAI',
      steps: [
        '1. Acesse https://platform.openai.com/signup',
        '2. Crie uma conta OpenAI',
        '3. Adicione método de pagamento',
        '4. Vá em https://platform.openai.com/api-keys',
        '5. Clique em "Create new secret key"',
        '6. Dê um nome (ex: "Rounder")',
        '7. Copie a chave (só aparece uma vez!)',
        '8. Cole aqui no App Rounder',
        '⚠️ Atenção: API paga, monitore uso'
      ]
    }
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3 para análise médica detalhada (pago)',
    icon: '🎭',
    signupUrl: 'https://console.anthropic.com',
    isFree: false,
    tutorial: {
      title: 'Como obter API Key do Anthropic Claude',
      steps: [
        '1. Acesse https://console.anthropic.com',
        '2. Clique em "Sign Up"',
        '3. Crie conta com email',
        '4. Adicione método de pagamento',
        '5. Vá em "API Keys"',
        '6. Clique em "Create Key"',
        '7. Copie a chave',
        '8. Cole aqui no App Rounder',
        '⚠️ Atenção: API paga, monitore uso'
      ]
    }
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini Pro para processamento multimodal',
    icon: '🌟',
    signupUrl: 'https://makersuite.google.com/app/apikey',
    isFree: true,
    tutorial: {
      title: 'Como obter API Key do Google Gemini',
      steps: [
        '1. Acesse https://makersuite.google.com/app/apikey',
        '2. Faça login com sua conta Google',
        '3. Clique em "Create API Key"',
        '4. Selecione um projeto ou crie novo',
        '5. Copie a API Key gerada',
        '6. Cole aqui no App Rounder',
        '✅ Pronto! API gratuita do Google'
      ]
    }
  }
];

interface APIConfigProps {
  onClose: () => void;
}

export const APIConfig: React.FC<APIConfigProps> = ({ onClose }) => {
  const [selectedAPIs, setSelectedAPIs] = useState<string[]>([]);
  const [apiKeys, setAPIKeys] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showTutorial, setShowTutorial] = useState<string | null>(null);

  useEffect(() => {
    loadSavedAPIs();
  }, []);

  const loadSavedAPIs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar configurações do usuário no Supabase
      const { data, error } = await supabase
        .from('user_profiles')
        .select('api_config')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar APIs do Supabase:', error);
        // Fallback para localStorage
        const saved = localStorage.getItem('selectedAPIs');
        const keys = localStorage.getItem('apiKeys');
        if (saved) setSelectedAPIs(JSON.parse(saved));
        if (keys) setAPIKeys(JSON.parse(keys));
        return;
      }

      if (data?.api_config) {
        setSelectedAPIs(data.api_config.selectedAPIs || []);
        setAPIKeys(data.api_config.apiKeys || {});
      }
    } catch (error) {
      console.error('Erro ao carregar APIs:', error);
    }
  };

  const toggleAPI = (apiId: string) => {
    setSelectedAPIs(prev =>
      prev.includes(apiId)
        ? prev.filter(id => id !== apiId)
        : [...prev, apiId]
    );
  };

  const handleKeyChange = (apiId: string, key: string) => {
    setAPIKeys(prev => ({ ...prev, [apiId]: key }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Você precisa estar logado para salvar as configurações');
        setIsSaving(false);
        return;
      }

      // Salvar no Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          api_config: {
            selectedAPIs,
            apiKeys
          }
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        // Fallback para localStorage
        localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
        localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
      }
      
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setIsSaving(false);
      alert('Erro ao salvar configurações');
    }
  };

  const openTutorial = (apiId: string) => {
    setShowTutorial(apiId);
  };

  const closeTutorial = () => {
    setShowTutorial(null);
  };

  const openSignupPage = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content api-config-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🔑 Configurar APIs de IA</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <p className="modal-description">
            Selecione as APIs que deseja usar para gerar seus rounds médicos
          </p>

          <div className="api-grid">
            {API_PROVIDERS.map((api) => (
              <div
                key={api.id}
                className={`api-card ${selectedAPIs.includes(api.id) ? 'selected' : ''}`}
              >
                <div className="api-card-header">
                  <div className="api-info">
                    <span className="api-icon">{api.icon}</span>
                    <div>
                      <h3>{api.name}</h3>
                      <p>{api.description}</p>
                      {api.isFree && <span className="free-badge">✨ Gratuito</span>}
                      {!api.isFree && <span className="paid-badge">💳 Pago</span>}
                    </div>
                  </div>
                  <div className="api-actions">
                    <button
                      className="info-button"
                      onClick={() => openTutorial(api.id)}
                      title="Ver tutorial"
                    >
                      ℹ️
                    </button>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={selectedAPIs.includes(api.id)}
                        onChange={() => toggleAPI(api.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {selectedAPIs.includes(api.id) && (
                  <div className="api-key-input">
                    <label>API Key:</label>
                    <input
                      type="password"
                      placeholder="Cole sua API key aqui"
                      value={apiKeys[api.id] || ''}
                      onChange={(e) => handleKeyChange(api.id, e.target.value)}
                    />
                    <button
                      className="get-key-button"
                      onClick={() => openSignupPage(api.signupUrl)}
                    >
                      🔗 Obter Chave Gratuita
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button className="cancel-button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : `Salvar ${selectedAPIs.length} APIs`}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Tutorial */}
      {showTutorial && (
        <div className="modal-overlay" onClick={closeTutorial}>
          <div className="modal-content tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {API_PROVIDERS.find(api => api.id === showTutorial)?.icon}{' '}
                {API_PROVIDERS.find(api => api.id === showTutorial)?.tutorial.title}
              </h2>
              <button className="close-button" onClick={closeTutorial}>×</button>
            </div>

            <div className="tutorial-content">
              {API_PROVIDERS.find(api => api.id === showTutorial)?.tutorial.steps.map((step, index) => (
                <div key={index} className="tutorial-step">
                  {step}
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button
                className="primary-button"
                onClick={() => {
                  const api = API_PROVIDERS.find(a => a.id === showTutorial);
                  if (api) openSignupPage(api.signupUrl);
                }}
              >
                🔗 Ir para Cadastro
              </button>
              <button className="secondary-button" onClick={closeTutorial}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default APIConfig;
