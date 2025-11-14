/**
 * Serviço de IA - OpenAI + Groq
 */

import OpenAI from 'openai';

// ==========================================
// CLIENTE OPENAI (AGENTE 1)
// ==========================================

export async function processarComOpenAI(
  apiKey: string,
  documentoAnterior: string,
  transcricao: string,
  regrasAprendidas: string[],
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  onProgress?.(30, '🤖 AGENTE 1: Processando com OpenAI...');

  const prompt = construirPromptProcessamento(documentoAnterior, transcricao, regrasAprendidas);

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo mais econômico
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente médico especializado em gerar rounds de UTI.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const texto = completion.choices[0]?.message?.content || '';
    onProgress?.(60, '🤖 AGENTE 1: Processamento concluído');
    
    return texto;
  } catch (error: any) {
    throw new Error(`Erro no OpenAI: ${error.message}`);
  }
}

// ==========================================
// CLIENTE GROQ (AGENTE 2 + WHISPER)
// ==========================================

export async function validarComGroq(
  apiKey: string,
  documentoBruto: string,
  regrasAprendidas: string[],
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true,
  });

  onProgress?.(70, '🤖 AGENTE 2: Validando com Groq...');

  const prompt = construirPromptValidacao(documentoBruto, regrasAprendidas);

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Você é um validador de documentos médicos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 8192,
    });

    const texto = completion.choices[0]?.message?.content || documentoBruto;
    onProgress?.(90, '🤖 AGENTE 2: Validação concluída');
    
    return texto;
  } catch (error: any) {
    // Se der erro de rate limit, retorna documento bruto
    if (error.message?.includes('Rate limit')) {
      console.warn('Rate limit do Groq, retornando documento bruto');
      return documentoBruto;
    }
    throw new Error(`Erro no Groq: ${error.message}`);
  }
}

export async function transcreverAudio(
  apiKey: string,
  audioFile: File,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true,
  });

  onProgress?.(5, '🔊 Transcrevendo áudio...');

  try {
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'text',
    });

    onProgress?.(15, '🔊 Transcrição concluída');
    return transcription as unknown as string;
  } catch (error: any) {
    throw new Error(`Erro na transcrição: ${error.message}`);
  }
}

export async function analisarFeedback(
  apiKey: string,
  feedbackTexto: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string[]> {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true,
  });

  onProgress?.(50, '🧠 Analisando feedback...');

  const prompt = `Você é um analisador de feedback médico.

# FEEDBACK DO USUÁRIO:
\`\`\`
${feedbackTexto}
\`\`\`

# TAREFA:
Extraia regras e aprendizados deste feedback.

Retorne uma lista de regras no formato:
1. Regra 1
2. Regra 2
3. Regra 3

Seja específico e objetivo. Foque em regras acionáveis.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'Você é um analisador de feedback. Extraia regras claras e objetivas.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const texto = completion.choices[0]?.message?.content || '';
    
    // Extrair regras numeradas
    const regras = texto
      .split('\n')
      .filter(linha => /^\d+\./.test(linha.trim()))
      .map(linha => linha.replace(/^\d+\.\s*/, '').trim())
      .filter(r => r.length > 0);

    onProgress?.(100, '🧠 Análise concluída');
    return regras;
  } catch (error: any) {
    throw new Error(`Erro na análise: ${error.message}`);
  }
}

// ==========================================
// PROMPTS
// ==========================================

function construirPromptProcessamento(
  documentoAnterior: string,
  transcricao: string,
  regrasAprendidas: string[]
): string {
  return `Você é um assistente médico especializado em gerar rounds de UTI.

# REGRAS APRENDIDAS (APLICAR RIGOROSAMENTE):
${regrasAprendidas.length > 0 ? regrasAprendidas.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Nenhuma regra aprendida ainda.'}

# REGRAS DE CORES (NUNCA VIOLAR):
1. **VERMELHO**: APENAS novidades de HOJE
   - Exames solicitados hoje
   - Antibióticos iniciados hoje (D0)
   - Condutas novas de hoje
   
2. **AMARELO SUBLINHADO**: APENAS pendências
   - Exames sem resultado
   - Consultas sem resposta
   - Procedimentos pendentes
   - Incrementar contador diário (D0→D1→D2)

3. **VERDE**: APENAS finalizações
   - Exames com resultado
   - Consultas respondidas
   - Procedimentos realizados
   - Antibióticos suspensos

4. **AZUL**: APENAS títulos de leitos
   - "LEITO 01", "LEITO 02", etc.
   - "EXTRA A", "EXTRA B", etc.

# REGRAS DE CONTADORES:
- Antibióticos: D0 (início) → D1 → D2 → D3... até suspensão
- Exames: D0 (solicitação) → D1 → D2... até resultado
- Consultas: D0 (solicitação) → D1 → D2... até resposta

# DOCUMENTO DO DIA ANTERIOR:
\`\`\`
${documentoAnterior}
\`\`\`

# TRANSCRIÇÃO DO DIA DE HOJE:
\`\`\`
${transcricao}
\`\`\`

# TAREFA:
1. Analise cada leito individualmente
2. Compare com o dia anterior
3. Identifique novidades (VERMELHO)
4. Identifique pendências (AMARELO)
5. Identifique finalizações (VERDE)
6. Incremente contadores automaticamente
7. Atualize a data para hoje
8. Preserve 100% da formatação
9. Gere o documento do round de hoje

# FORMATO DE SAÍDA:
Retorne o documento completo do round de hoje, com:
- Data atualizada
- Todos os leitos processados
- Cores aplicadas corretamente
- Contadores incrementados
- Formatação preservada

NÃO adicione comentários ou explicações, apenas o documento final.`;
}

function construirPromptValidacao(
  documentoBruto: string,
  regrasAprendidas: string[]
): string {
  return `Você é um validador de documentos médicos.

# REGRAS APRENDIDAS:
${regrasAprendidas.length > 0 ? regrasAprendidas.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Nenhuma regra aprendida ainda.'}

# DOCUMENTO PARA VALIDAR:
\`\`\`
${documentoBruto}
\`\`\`

# TAREFA:
1. Verifique se todas as cores estão corretas
2. Verifique se contadores foram incrementados
3. Verifique se a data foi atualizada
4. Verifique se a estrutura está preservada
5. Corrija erros se encontrar

# FORMATO DE SAÍDA:
Retorne o documento final validado e corrigido.
NÃO adicione comentários ou explicações, apenas o documento final.`;
}

// ==========================================
// SISTEMA DE APRENDIZADO
// ==========================================

const STORAGE_KEY = 'app_rounder_regras_aprendidas';

export function carregarRegras(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function salvarRegras(regras: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regras));
  } catch (error) {
    console.error('Erro ao salvar regras:', error);
  }
}

export function adicionarRegras(novasRegras: string[]): void {
  const regrasAtuais = carregarRegras();
  const regrasUnicas = [...new Set([...regrasAtuais, ...novasRegras])];
  salvarRegras(regrasUnicas);
}

export function removerRegra(indice: number): void {
  const regras = carregarRegras();
  regras.splice(indice, 1);
  salvarRegras(regras);
}

export function limparRegras(): void {
  localStorage.removeItem(STORAGE_KEY);
}
