import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import './APIConfig.css';

interface APIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  freeUrl: string;
  requiresKey: boolean;
}

const API_PROVIDERS: APIProvider[] = [
  {
    id: 'qwen',
    name: 'Alibaba Qwen',
    description: 'Maior limite gratuito - Modelo avançado da Alibaba Cloud',
    icon: '🚀',
    freeUrl: 'https://dashscope.aliyun.com (gratuito)',
    requiresKey: true
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'API de IA ultra-rápida para geração de texto médico',
    icon: '🧠',
    freeUrl: 'https://cerebras.ai (gratuito)',
    requiresKey: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Modelo de IA avançado para análise médica profunda',
    icon: '🔍',
    freeUrl: 'https://platform.deepseek.com (gratuito)',
    requiresKey: true
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Processamento de IA em alta velocidade',
    icon: '⚡',
    freeUrl: 'https://console.groq.com/keys (gratuito)',
    requiresKey: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 e modelos avançados (pago)',
    icon: '🤖',
    freeUrl: '',
    requiresKey: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3 para análise médica detalhada (pago)',
    icon: '🎭',
    freeUrl: '',
    requiresKey: true
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini Pro para processamento multimodal',
    icon: '🌟',
    freeUrl: 'https://makersuite.google.com (gratuito)',
    requiresKey: true
  }
];

interface APIConfigProps {
  onClose: () => void;
}

export const APIConfig: React.FC<APIConfigProps> = ({ onClose }) => {
  const [selectedAPIs, setSelectedAPIs] = useState<string[]>([]);
  const [apiKeys, setAPIKeys] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAPIConfig();
  }, []);

  const loadAPIConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const selected: string[] = [];
        const keys: Record<string, string> = {};

        data.forEach((item: any) => {
          selected.push(item.provider);
          keys[item.provider] = item.api_key || '';
        });

        setSelectedAPIs(selected);
        setAPIKeys(keys);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de APIs:', error);
    }
  };

  const handleToggleAPI = (apiId: string) => {
    setSelectedAPIs(prev => {
      if (prev.includes(apiId)) {
        return prev.filter(id => id !== apiId);
      } else {
        return [...prev, apiId];
      }
    });
  };

  const handleKeyChange = (apiId: string, value: string) => {
    setAPIKeys(prev => ({
      ...prev,
      [apiId]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Deletar todas as configurações antigas
      await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id);

      // Inserir novas configurações
      const inserts = selectedAPIs.map(apiId => ({
        user_id: user.id,
        provider: apiId,
        api_key: apiKeys[apiId] || '',
        is_active: true
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from('user_api_keys')
          .insert(inserts);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="api-config-modal" onClick={onClose}>
      <div className="api-config-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="api-config-header">
          <h2>🔑 Configurar APIs de IA</h2>
          <p>Selecione as APIs que deseja usar para gerar seus rounds médicos</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="api-providers-grid">
          {API_PROVIDERS.map(provider => (
            <div 
              key={provider.id}
              className={`api-provider-card ${selectedAPIs.includes(provider.id) ? 'selected' : ''}`}
            >
              <div className="provider-header">
                <div className="provider-icon">{provider.icon}</div>
                <div className="provider-info">
                  <h3>{provider.name}</h3>
                  <p>{provider.description}</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={selectedAPIs.includes(provider.id)}
                    onChange={() => handleToggleAPI(provider.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {selectedAPIs.includes(provider.id) && (
                <div className="provider-config">
                  {provider.freeUrl && (
                    <div className="free-badge">
                      ✨ Gratuito - <a href={provider.freeUrl} target="_blank" rel="noopener noreferrer">Obter chave</a>
                    </div>
                  )}
                  
                  <div className="api-key-input">
                    <label>API Key</label>
                    <input
                      type="password"
                      placeholder={`Cole sua ${provider.name} API Key aqui...`}
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="api-config-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={isSaving || selectedAPIs.length === 0}
          >
            {isSaving ? 'Salvando...' : `Salvar ${selectedAPIs.length} API${selectedAPIs.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIConfig;
