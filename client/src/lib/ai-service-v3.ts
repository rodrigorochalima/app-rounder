/**
 * Serviço de IA v3 - Com Gerenciamento Profissional de API Keys
 * Cerebras + Qwen + Groq (com chaves do Supabase)
 */

import { getActiveApiKeysForUse, recordApiKeyUsage } from './api-keys-service';
import { validarTerminologiaMedica, formatarRelatorioCorrecoes } from './validador-medico';
import { buscarRegrasAtivas } from './supabase';

// ============================================
// CEREBRAS API (AGENTE 1 - Processamento)
// ============================================

export class CerebrasAgent {
  private apiKey: string;
  private baseURL = 'https://api.cerebras.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processar(prompt: string, onProgress?: (progress: number, message: string) => void): Promise<string> {
    try {
      if (onProgress) onProgress(30, '🤖 AGENTE 1: Processando com Cerebras...');

      console.log('[CEREBRAS] Iniciando requisição...');

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente médico especializado em rounds de UTI. Analise leito por leito com precisão.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CEREBRAS] Erro HTTP:', response.status, response.statusText);
        throw new Error(`Cerebras Error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      const resultado = data.choices[0].message.content;

      if (onProgress) onProgress(60, '✅ AGENTE 1: Processamento concluído!');

      return resultado;
    } catch (error: any) {
      console.error('[CEREBRAS] Erro completo:', error);
      throw new Error(`Erro no Cerebras: ${error.message}`);
    }
  }
}

// ============================================
// QWEN API (AGENTE 2 - Validação) - NOVO!
// ============================================

export class QwenAgent {
  private apiKey: string;
  private baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async validar(documentoBruto: string, onProgress?: (progress: number, message: string) => void): Promise<string> {
    try {
      if (onProgress) onProgress(70, '🔍 AGENTE 2: Validando com Qwen 3 Turbo...');

      console.log('[QWEN] Iniciando validação...');

      const prompt = `
Você é um validador de documentos médicos. Analise o documento abaixo e:

1. Verifique se todas as cores estão corretas (vermelho/amarelo/verde)
2. Confirme se os contadores estão incrementados (D0→D1→D2)
3. Valide a estrutura e formatação
4. Corrija pequenos erros se necessário
5. Retorne o documento final validado

DOCUMENTO:
${documentoBruto}

Retorne APENAS o documento corrigido, sem explicações adicionais.
`;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo',  // Modelo mais rápido e barato
          messages: [
            {
              role: 'system',
              content: 'Você é um validador de documentos médicos especializado em rounds de UTI.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[QWEN] Erro HTTP:', response.status, response.statusText);
        console.error('[QWEN] Resposta:', errorText);
        throw new Error(`Qwen Error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      console.log('[QWEN] Resposta recebida');
      
      const documentoFinal = data.choices[0].message.content;
      console.log('[QWEN] Documento validado com sucesso');

      if (onProgress) onProgress(90, '✅ AGENTE 2: Validação concluída!');

      return documentoFinal;
    } catch (error: any) {
      console.error('[QWEN] Erro completo:', error);
      throw new Error(`Erro no Qwen: ${error.message}`);
    }
  }
}

// ============================================
// GROQ API (Transcrição de Áudio)
// ============================================

export class GroqWhisper {
  private apiKey: string;
  private baseURL = 'https://api.groq.com/openai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcrever(audioFile: File, onProgress?: (progress: number, message: string) => void): Promise<string> {
    try {
      if (onProgress) onProgress(10, '🎤 Transcrevendo áudio...');

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'pt');
      formData.append('response_format', 'text');

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq Whisper Error: ${JSON.stringify(error)}`);
      }

      const transcricao = await response.text();

      if (onProgress) onProgress(20, '✅ Transcrição concluída!');

      return transcricao;
    } catch (error: any) {
      throw new Error(`Erro na transcrição: ${error.message}`);
    }
  }
}

// ============================================
// SISTEMA DE APRENDIZADO
// ============================================

export interface RegraAprendida {
  id: string;
  tipo: 'cor' | 'contador' | 'formatacao' | 'preferencia';
  descricao: string;
  exemplo?: string;
  dataAprendizado: string;
}

export class SistemaAprendizado {
  private readonly STORAGE_KEY = 'app_rounder_regras_aprendidas';

  salvarRegra(regra: Omit<RegraAprendida, 'id' | 'dataAprendizado'>): void {
    const regras = this.obterRegras();
    const novaRegra: RegraAprendida = {
      ...regra,
      id: Date.now().toString(),
      dataAprendizado: new Date().toISOString(),
    };
    regras.push(novaRegra);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(regras));
  }

  obterRegras(): RegraAprendida[] {
    const regrasJSON = localStorage.getItem(this.STORAGE_KEY);
    return regrasJSON ? JSON.parse(regrasJSON) : [];
  }

  removerRegra(id: string): void {
    const regras = this.obterRegras().filter(r => r.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(regras));
  }

  limparTodas(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async gerarPromptComRegras(): Promise<string> {
    // Buscar regras do Supabase
    const regrasSupabase = await buscarRegrasAtivas();
    
    // Buscar regras do localStorage (legado)
    const regrasLocal = this.obterRegras();
    
    // Combinar todas as regras
    const todasRegras = [...regrasSupabase, ...regrasLocal];
    
    if (todasRegras.length === 0) return '';

    let prompt = '\n\n## REGRAS APRENDIDAS (SEMPRE SEGUIR):\n\n';
    
    todasRegras.forEach((regra, index) => {
      prompt += `${index + 1}. [${regra.tipo.toUpperCase()}] ${regra.descricao}\n`;
      if (regra.exemplo) {
        prompt += `   Exemplo: ${regra.exemplo}\n`;
      }
    });

    return prompt;
  }
}

// ============================================
// PROCESSADOR PRINCIPAL (COM SUPABASE)
// ============================================

export class ProcessadorRound {
  private cerebras?: CerebrasAgent;
  private qwen?: QwenAgent;
  private whisper?: GroqWhisper;
  private aprendizado: SistemaAprendizado;
  private institutionId: string;

  constructor(institutionId: string) {
    this.institutionId = institutionId;
    this.aprendizado = new SistemaAprendizado();
  }

  /**
   * Inicializa os agentes buscando API keys do Supabase
   */
  private async inicializarAgentes(): Promise<void> {
    console.log('[PROCESSADOR] Buscando API keys do Supabase...');
    
    const keys = await getActiveApiKeysForUse(this.institutionId);
    
    console.log('[PROCESSADOR] Keys encontradas:', Object.keys(keys));

    if (keys.cerebras) {
      this.cerebras = new CerebrasAgent(keys.cerebras);
      console.log('[PROCESSADOR] Cerebras inicializado');
    }

    if (keys.qwen) {
      this.qwen = new QwenAgent(keys.qwen);
      console.log('[PROCESSADOR] Qwen inicializado');
    }

    if (keys.groq) {
      this.whisper = new GroqWhisper(keys.groq);
      console.log('[PROCESSADOR] Groq Whisper inicializado');
    }

    // Validar que temos as keys necessárias
    if (!this.cerebras) {
      throw new Error('API Key do Cerebras não encontrada. Configure no painel admin.');
    }

    if (!this.qwen) {
      throw new Error('API Key do Qwen não encontrada. Configure no painel admin.');
    }

    if (!this.whisper) {
      throw new Error('API Key do Groq não encontrada. Configure no painel admin.');
    }
  }

  async processar(
    docAnterior: string,
    transcricao: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    try {
      // Inicializar agentes com keys do Supabase
      await this.inicializarAgentes();

      // ETAPA 1: Processamento com Cerebras
      const regrasAprendidas = await this.aprendizado.gerarPromptComRegras();
      
      const promptProcessamento = `
# TAREFA: Gerar Round Médico de Hoje

## DOCUMENTO DO DIA ANTERIOR:
${docAnterior}

## TRANSCRIÇÃO DA DISCUSSÃO DE HOJE:
${transcricao}

## INSTRUÇÕES:

1. **IDENTIFICAÇÃO DE PACIENTE**:
   - Compare o nome do paciente no documento anterior com a transcrição
   - Se for PACIENTE DIFERENTE: RESETAR todos os contadores para D0
   - Se for MESMO PACIENTE: INCREMENTAR contadores (D0→D1→D2→D3)

2. **SISTEMA DE CORES** (use tags HTML):
   - VERMELHO (<span style="color: red;">texto</span>): Novos diagnósticos, novos procedimentos, pioras (D0)
   - AMARELO (<span style="color: #DAA520;">texto</span>): Em andamento, atenção, D1-D2
   - VERDE (<span style="color: green;">texto</span>): Resolvido, melhora, alta (D3+)

3. **CONTADORES**:
   - Antibióticos: D0, D1, D2, D3...
   - Drogas vasoativas: D0, D1, D2...
   - Procedimentos: D0, D1, D2...
   - Sintomas: D0, D1, D2...

4. **ESTRUTURA POR LEITO**:
   - Nome do paciente
   - Idade e diagnóstico principal
   - Evolução clínica
   - Exames relevantes
   - Conduta

${regrasAprendidas}

Retorne APENAS o documento formatado, sem explicações.
`;

      const documentoBruto = await this.cerebras!.processar(promptProcessamento, onProgress);
      
      // Registrar uso da API
      await recordApiKeyUsage(this.institutionId, 'cerebras');

      // ETAPA 2: Validação com Qwen
      const documentoValidado = await this.qwen!.validar(documentoBruto, onProgress);
      
      // Registrar uso da API
      await recordApiKeyUsage(this.institutionId, 'qwen');

      // ETAPA 3: Validação de terminologia médica (Groq)
      if (onProgress) onProgress(95, '🔬 Validando terminologia médica...');
      
      const termos = await validarTerminologiaMedica(documentoValidado);
      console.log('[VALIDAÇÃO] Termos validados:', termos.length);

      if (onProgress) onProgress(100, '✅ Processamento completo!');

      return documentoValidado;
    } catch (error: any) {
      console.error('[PROCESSADOR] Erro:', error);
      throw new Error(`Erro no processamento: ${error.message}`);
    }
  }

  async transcreverAudio(
    audioFile: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    await this.inicializarAgentes();
    
    const transcricao = await this.whisper!.transcrever(audioFile, onProgress);
    
    // Registrar uso da API
    await recordApiKeyUsage(this.institutionId, 'groq');
    
    return transcricao;
  }
}

// ============================================
// FUNÇÃO AUXILIAR PARA COMPATIBILIDADE
// ============================================

/**
 * Cria processador com API keys manuais (modo legado)
 * Para uso quando não há instituição configurada
 */
export class ProcessadorRoundLegacy {
  private cerebras: CerebrasAgent;
  private qwen: QwenAgent;
  private whisper: GroqWhisper;
  private aprendizado: SistemaAprendizado;

  constructor(cerebrasKey: string, qwenKey: string, groqKey: string) {
    this.cerebras = new CerebrasAgent(cerebrasKey);
    this.qwen = new QwenAgent(qwenKey);
    this.whisper = new GroqWhisper(groqKey);
    this.aprendizado = new SistemaAprendizado();
  }

  async processar(
    docAnterior: string,
    transcricao: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    // Mesma lógica do ProcessadorRound, mas sem Supabase
    const regrasAprendidas = await this.aprendizado.gerarPromptComRegras();
    
    const promptProcessamento = `
# TAREFA: Gerar Round Médico de Hoje

## DOCUMENTO DO DIA ANTERIOR:
${docAnterior}

## TRANSCRIÇÃO DA DISCUSSÃO DE HOJE:
${transcricao}

## INSTRUÇÕES:

1. **IDENTIFICAÇÃO DE PACIENTE**:
   - Compare o nome do paciente no documento anterior com a transcrição
   - Se for PACIENTE DIFERENTE: RESETAR todos os contadores para D0
   - Se for MESMO PACIENTE: INCREMENTAR contadores (D0→D1→D2→D3)

2. **SISTEMA DE CORES** (use tags HTML):
   - VERMELHO (<span style="color: red;">texto</span>): Novos diagnósticos, novos procedimentos, pioras (D0)
   - AMARELO (<span style="color: #DAA520;">texto</span>): Em andamento, atenção, D1-D2
   - VERDE (<span style="color: green;">texto</span>): Resolvido, melhora, alta (D3+)

3. **CONTADORES**:
   - Antibióticos: D0, D1, D2, D3...
   - Drogas vasoativas: D0, D1, D2...
   - Procedimentos: D0, D1, D2...
   - Sintomas: D0, D1, D2...

4. **ESTRUTURA POR LEITO**:
   - Nome do paciente
   - Idade e diagnóstico principal
   - Evolução clínica
   - Exames relevantes
   - Conduta

${regrasAprendidas}

Retorne APENAS o documento formatado, sem explicações.
`;

    const documentoBruto = await this.cerebras.processar(promptProcessamento, onProgress);
    const documentoValidado = await this.qwen.validar(documentoBruto, onProgress);

    if (onProgress) onProgress(95, '🔬 Validando terminologia médica...');
    await validarTerminologiaMedica(documentoValidado);

    if (onProgress) onProgress(100, '✅ Processamento completo!');

    return documentoValidado;
  }

  async transcreverAudio(
    audioFile: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    return this.whisper.transcrever(audioFile, onProgress);
  }
}
