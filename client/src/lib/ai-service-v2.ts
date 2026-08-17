/**
 * Serviço de IA com Cerebras + DeepSeek + Groq (100% GRATUITO)
 */

// DeepSeek não precisa de biblioteca externa, usa fetch direto
import { validarTerminologiaMedica, formatarRelatorioCorrecoes } from './validador-medico';
import { secureChat, secureTranscription } from './server-ai.service';
import { roundRulesAPI } from './api';

// ============================================
// CEREBRAS API (AGENTE 1 - Processamento)
// ============================================

export class CerebrasAgent {
  async processar(prompt: string, onProgress?: (progress: number, message: string) => void): Promise<string> {
    if (onProgress) onProgress(30, '🤖 Processando com Cerebras...');
    try {
      const resultado = await secureChat({
        provider: 'cerebras',
        model: 'llama-3.3-70b',
        system: 'Você é um assistente médico especializado em rounds de UTI. Analise leito por leito com precisão.',
        prompt,
        temperature: 0.3,
        maxTokens: 8000,
      });
      if (onProgress) onProgress(60, '✅ Processamento concluído!');
      return resultado;
    } catch (error: any) {
      throw new Error(`Erro no processamento principal: ${error.message}`);
    }
  }
}

// ============================================
// DEEPSEEK API (AGENTE 2 - Validação)
// ============================================

export class DeepSeekAgent {
  async validar(documentoBruto: string, onProgress?: (progress: number, message: string) => void): Promise<string> {
    if (onProgress) onProgress(70, '🔍 Validando estrutura clínica...');
    const prompt = `Revise o documento abaixo. Preserve nomes, leitos, cores e contadores; corrija apenas incoerências de estrutura e formatação. Retorne somente o documento final.\n\nDOCUMENTO:\n${documentoBruto}`;
    try {
      const documentoFinal = await secureChat({
        provider: 'deepseek',
        model: 'deepseek-chat',
        system: 'Você é um validador de documentos médicos especializado em rounds de UTI.',
        prompt,
        temperature: 0.3,
        maxTokens: 8000,
      });
      if (onProgress) onProgress(90, '✅ Validação concluída!');
      return documentoFinal;
    } catch (error: any) {
      throw new Error(`Erro na validação: ${error.message}`);
    }
  }
}

// ============================================
// GROQ API (Transcrição de Áudio)
// ============================================

export class GroqWhisper {
  async transcrever(audioFile: File, onProgress?: (progress: number, message: string) => void): Promise<string> {
    if (onProgress) onProgress(10, '🎤 Transcrevendo áudio...');
    try {
      const transcricao = await secureTranscription(audioFile);
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
    const resultado = await roundRulesAPI.list().catch(() => ({ data: [] }));
    const regrasPersistidas = (resultado.data || []).filter((regra: any) => regra.is_active !== false).map((regra: any) => ({
      tipo: 'preferencia' as const,
      descricao: regra.rule_text,
    }));
    const todasRegras = [...regrasPersistidas, ...this.obterRegras()];
    if (todasRegras.length === 0) return '';

    let prompt = '\n\n## REGRAS CLÍNICAS E DE FORMATAÇÃO (SEMPRE SEGUIR):\n\n';
    todasRegras.forEach((regra, index) => {
      prompt += `${index + 1}. ${regra.descricao}\n`;
      if (regra.exemplo) prompt += `   Exemplo: ${regra.exemplo}\n`;
    });
    return prompt;
  }
}

// ============================================
// PROCESSADOR PRINCIPAL
// ============================================

export class ProcessadorRound {
  private cerebras: CerebrasAgent;
  private deepseek: DeepSeekAgent;
  private whisper: GroqWhisper;
  private aprendizado: SistemaAprendizado;

  constructor() {
    this.cerebras = new CerebrasAgent();
    this.deepseek = new DeepSeekAgent();
    this.whisper = new GroqWhisper();
    this.aprendizado = new SistemaAprendizado();
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

      // ETAPA 2: Validação com DeepSeek
      const documentoValidado = await this.deepseek.validar(documentoBruto, onProgress);

      // ETAPA 3: Validação de Terminologia Médica com Groq
      if (onProgress) onProgress(92, '🏥 AGENTE 3: Validando terminologia médica...');
      
      const resultadoValidacao = await validarTerminologiaMedica(documentoValidado);
      
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

      // Analisar feedback com DeepSeek
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

      const regrasJSON = (await secureChat({
        provider: 'deepseek',
        model: 'deepseek-chat',
        system: 'Você é um assistente que extrai regras de feedbacks médicos.',
        prompt: promptAnalise,
        temperature: 0.3,
        maxTokens: 2000,
      })).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

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
