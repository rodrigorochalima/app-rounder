/**
 * Serviço de IA com Cerebras + Gemini (100% GRATUITO)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
      console.log('[CEREBRAS] API Key:', this.apiKey.substring(0, 10) + '...');

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
        console.error('[CEREBRAS] Resposta:', errorText);
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
// GEMINI API (AGENTE 2 - Validação)
// ============================================

export class GeminiAgent {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async validar(documentoBruto: string, onProgress?: (progress: number, message: string) => void): Promise<string> {
    try {
      if (onProgress) onProgress(70, '🔍 AGENTE 2: Validando com Gemini...');

      console.log('[GEMINI] Iniciando validação...');
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8000,
        }
      });

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

      const result = await model.generateContent(prompt);
      console.log('[GEMINI] Resposta recebida');
      
      const response = await result.response;
      console.log('[GEMINI] Status:', response);
      
      const documentoFinal = response.text();
      console.log('[GEMINI] Documento validado com sucesso');

      if (onProgress) onProgress(90, '✅ AGENTE 2: Validação concluída!');

      return documentoFinal;
    } catch (error: any) {
      console.error('[GEMINI] Erro completo:', error);
      console.error('[GEMINI] Stack:', error.stack);
      console.error('[GEMINI] Message:', error.message);
      throw new Error(`Erro no Gemini: ${error.message}`);
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
// PROCESSADOR PRINCIPAL
// ============================================

export class ProcessadorRound {
  private cerebras: CerebrasAgent;
  private gemini: GeminiAgent;
  private whisper: GroqWhisper;
  private aprendizado: SistemaAprendizado;
  private groqKey: string;

  constructor(cerebrasKey: string, geminiKey: string, groqKey: string) {
    this.cerebras = new CerebrasAgent(cerebrasKey);
    this.gemini = new GeminiAgent(geminiKey);
    this.whisper = new GroqWhisper(groqKey);
    this.aprendizado = new SistemaAprendizado();
    this.groqKey = groqKey;
  }

  async processar(
    docAnterior: string,
    transcricao: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    try {
      // ETAPA 1: Processamento com Cerebras
      const regrasAprendidas = await this.aprendizado.gerarPromptComRegras();
      
      const promptProcessamento = `
# TAREFA: Gerar Round Médico de Hoje

## DOCUMENTO DO DIA ANTERIOR:
${docAnterior}

## TRANSCRIÇÃO DA DISCUSSÃO DE HOJE:
${transcricao}

${regrasAprendidas}

## INSTRUÇÕES:

1. **Analise leito por leito** comparando dia anterior com discussão de hoje
2. **Aplique cores**:
   - VERMELHO: Novidades importantes
   - AMARELO: Pendências ou atenção
   - VERDE: Finalizações ou melhoras
   - AZUL: Informações estáveis

3. **Incremente contadores**:
   - Antibióticos: D0 → D1 → D2 → D3...
   - Dias de internação: +1
   - Dias de VM: +1 (se em ventilação)

4. **Atualize a data** para hoje

5. **Preserve a estrutura** do documento anterior

6. **Retorne o documento completo** pronto para uso

GERE O ROUND DE HOJE:
`;

      const documentoBruto = await this.cerebras.processar(promptProcessamento, onProgress);

      // ETAPA 2: Validação com Gemini
      const documentoValidado = await this.gemini.validar(documentoBruto, onProgress);

      // ETAPA 3: Validação de Terminologia Médica com Groq
      if (onProgress) onProgress(92, '🏥 AGENTE 3: Validando terminologia médica...');
      
      const resultadoValidacao = await validarTerminologiaMedica(documentoValidado, this.groqKey);
      
      if (onProgress) {
        const relatorio = formatarRelatorioCorrecoes(resultadoValidacao.correcoes);
        console.log('📋 Relatório de correções:', relatorio);
        onProgress(98, `✅ AGENTE 3: ${resultadoValidacao.correcoes.length} correções aplicadas!`);
      }

      if (onProgress) onProgress(100, '✅ Round gerado com sucesso!');

      return resultadoValidacao.documentoCorrigido;
    } catch (error: any) {
      throw new Error(`Erro no processamento: ${error.message}`);
    }
  }

  async processarComAudio(
    docAnterior: string,
    audioFile: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    // ETAPA 0: Transcrever áudio
    const transcricao = await this.whisper.transcrever(audioFile, onProgress);

    // ETAPA 1-2: Processar normalmente
    return this.processar(docAnterior, transcricao, onProgress);
  }

  async analisarFeedback(
    feedbackAudio: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    try {
      // Transcrever feedback
      const feedbackTexto = await this.whisper.transcrever(feedbackAudio, onProgress);

      // Analisar feedback com Gemini
      if (onProgress) onProgress(50, '🧠 Analisando feedback...');

      const promptAnalise = `
Analise o feedback abaixo e extraia REGRAS ESPECÍFICAS que devem ser seguidas nos próximos rounds.

FEEDBACK:
${feedbackTexto}

Retorne um JSON com as regras no formato:
[
  {
    "tipo": "cor" | "contador" | "formatacao" | "preferencia",
    "descricao": "Descrição clara da regra",
    "exemplo": "Exemplo opcional"
  }
]

Retorne APENAS o JSON, sem explicações.
`;

      const model = this.gemini['genAI'].getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(promptAnalise);
      const response = await result.response;
      const regrasJSON = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const regras = JSON.parse(regrasJSON);

      // Salvar regras
      regras.forEach((regra: any) => {
        this.aprendizado.salvarRegra(regra);
      });

      if (onProgress) onProgress(100, `✅ ${regras.length} regra(s) aprendida(s)!`);
    } catch (error: any) {
      throw new Error(`Erro ao analisar feedback: ${error.message}`);
    }
  }

  obterRegrasAprendidas(): RegraAprendida[] {
    return this.aprendizado.obterRegras();
  }

  removerRegra(id: string): void {
    this.aprendizado.removerRegra(id);
  }

  limparAprendizado(): void {
    this.aprendizado.limparTodas();
  }
}
