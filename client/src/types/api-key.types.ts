/**
 * Tipos relacionados a API keys
 */

export type AIProvider = 
  | 'qwen'
  | 'cerebras'
  | 'deepseek'
  | 'groq'
  | 'gemini'
  | 'claude'
  | 'openai'
  | 'mistral'
  | 'together'
  | 'huggingface';

export interface APIKey {
  id: string;
  institutionId: string;
  provider: AIProvider;
  name: string;
  encryptedKey: string;
  encryptionIv: string;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  monthlyLimit?: number;
  costPerMillionTokens?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedAPIKey extends Omit<APIKey, 'encryptedKey' | 'encryptionIv'> {
  key: string; // Chave descriptografada (apenas em memória)
}

export interface CreateAPIKeyData {
  provider: AIProvider;
  name: string;
  key: string; // Será criptografada antes de salvar
  monthlyLimit?: number;
  costPerMillionTokens?: number;
  notes?: string;
}

export interface UpdateAPIKeyData {
  name?: string;
  isActive?: boolean;
  isDefault?: boolean;
  monthlyLimit?: number;
  notes?: string;
}

export interface AIProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  logoUrl: string;
  signupUrl: string;
  docsUrl: string;
  isFree: boolean;
  costPerMillionTokens?: number;
  features: string[];
  recommended?: boolean;
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderInfo> = {
  qwen: {
    id: 'qwen',
    name: 'Alibaba Qwen',
    description: '5x mais barato, 1M tokens grátis, velocidade excepcional',
    logoUrl: '/logos/qwen.svg',
    signupUrl: 'https://www.alibabacloud.com/en/campaign/qwen-ai-landing-page',
    docsUrl: 'https://help.aliyun.com/zh/model-studio/getting-started/what-is-model-studio',
    isFree: true,
    costPerMillionTokens: 0.25,
    features: ['1M tokens grátis', '800-1000 tok/s', 'Multilíngue', 'OpenAI compatible'],
    recommended: true
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'IA ultrarrápida, gratuita, ideal para processamento em tempo real',
    logoUrl: '/logos/cerebras.svg',
    signupUrl: 'https://cerebras.ai',
    docsUrl: 'https://inference-docs.cerebras.ai',
    isFree: true,
    features: ['Gratuito', 'Velocidade extrema', 'Llama 3.3 70B'],
    recommended: true
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'IA chinesa de alta qualidade, gratuita',
    logoUrl: '/logos/deepseek.svg',
    signupUrl: 'https://platform.deepseek.com',
    docsUrl: 'https://platform.deepseek.com/docs',
    isFree: true,
    costPerMillionTokens: 0.42,
    features: ['Gratuito', 'Alta qualidade', 'Multilíngue']
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Inferência ultrarrápida com Llama',
    logoUrl: '/logos/groq.svg',
    signupUrl: 'https://console.groq.com',
    docsUrl: 'https://console.groq.com/docs',
    isFree: true,
    features: ['Gratuito', 'Llama 3.3', 'Velocidade alta']
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'IA do Google, multimodal, gratuita',
    logoUrl: '/logos/gemini.svg',
    signupUrl: 'https://aistudio.google.com/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    isFree: true,
    features: ['Gratuito', 'Multimodal', 'Google Cloud']
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'IA ética e segura da Anthropic',
    logoUrl: '/logos/claude.svg',
    signupUrl: 'https://console.anthropic.com',
    docsUrl: 'https://docs.anthropic.com',
    isFree: false,
    costPerMillionTokens: 3.0,
    features: ['Alta qualidade', 'Contexto longo', 'Seguro']
  },
  openai: {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'GPT-4 e GPT-3.5 da OpenAI',
    logoUrl: '/logos/openai.svg',
    signupUrl: 'https://platform.openai.com',
    docsUrl: 'https://platform.openai.com/docs',
    isFree: false,
    costPerMillionTokens: 5.0,
    features: ['GPT-4', 'Alta qualidade', 'Amplamente testado']
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'IA europeia de código aberto',
    logoUrl: '/logos/mistral.svg',
    signupUrl: 'https://console.mistral.ai',
    docsUrl: 'https://docs.mistral.ai',
    isFree: false,
    costPerMillionTokens: 0.7,
    features: ['Open source', 'Europeia', 'Rápida']
  },
  together: {
    id: 'together',
    name: 'Together AI',
    description: 'Plataforma de modelos open source',
    logoUrl: '/logos/together.svg',
    signupUrl: 'https://api.together.xyz',
    docsUrl: 'https://docs.together.ai',
    isFree: false,
    costPerMillionTokens: 0.6,
    features: ['Múltiplos modelos', 'Open source', 'Flexível']
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Hub de modelos de IA open source',
    logoUrl: '/logos/huggingface.svg',
    signupUrl: 'https://huggingface.co',
    docsUrl: 'https://huggingface.co/docs',
    isFree: true,
    features: ['Gratuito', 'Milhares de modelos', 'Comunidade ativa']
  }
};
