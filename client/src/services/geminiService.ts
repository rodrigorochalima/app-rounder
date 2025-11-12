import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIResponse, TimelineMessage } from "@/types";
import { timelineToText } from "./whatsappParser";

/**
 * Prompt do sistema para o Gemini
 */
const SYSTEM_PROMPT = `Você é um assistente clínico de IA. Sua tarefa é analisar a linha do tempo de uma conversa de plantão médico e gerar um prontuário estruturado em JSON e um resumo em Markdown.

REGRAS PRINCIPAIS:
1.  **Análise Autônoma:** Inferir nomes de pacientes, leitos e datas diretamente do conteúdo da conversa. Se nenhuma data for mencionada explicitamente, use as datas dos timestamps das mensagens como referência.
2.  **Rastreabilidade:** Ao extrair uma informação clínica relevante, cite a fonte usando o timestamp e o remetente, no formato (Fonte: HH:MM - Remetente).
3.  **Saída Dupla Obrigatória:** Sua resposta final DEVE conter dois blocos de código distintos: primeiro o JSON, depois o Markdown. Os blocos devem ser separados por uma única linha contendo apenas cinco hífens: "-----".
4.  **Checklist de Ações:** No final do bloco Markdown, crie OBRIGATORIAMENTE uma seção intitulada "✅ Checklist do Plantão". Esta seção deve listar de forma clara e objetiva todas as pendências, exames a serem coletados, condutas a serem reavaliadas e tarefas para a próxima equipe.

ESTRUTURA DO JSON (Siga rigorosamente):
{
  "data_referencia": "YYYY-MM-DD",
  "leitos": [
    {
      "leito": "UTI-01",
      "paciente": "Nome Completo",
      "resumo_clinico": "...",
      "antibioticos": [{"nome": "Droga", "status": "EM_USO|SUSPENSO", "dias": "D(x)"}],
      "terapias_nao_atb": ["..."],
      "exames_pendentes": [{"tipo": "Hemocultura", "data_pedido": "YYYY-MM-DD"}],
      "plano_cuidados": ["..."],
      "linha_do_tempo_eventos": ["YYYY-MM-DD HH:MM - Evento importante..."],
      "pontos_de_atencao": ["Alerta clínico importante."]
    }
  ]
}

ESTRUTURA DO MARKDOWN (Siga rigorosamente):
# 🏥 Prontuário do Plantão — {{data_referencia}}

## Leito: **{{leito}}**
**Paciente:** {{paciente}}

### 🩺 Resumo Clínico Atual
- ...

### 💊 Terapia Medicamentosa
- **Droga 1** - EM USO (D3/7)
- ~~**Droga 2**~~ - SUSPENSA

### 🧪 Pendências e Exames
- Hemocultura (YYYY-MM-DD) — **PENDENTE**
- 🔴 __**EXAME RECOMENDADO**__: Descrição do exame.

### 📝 Plano e Cuidados
- ...

### 🚩 Pontos de Atenção
- 🔴 __**PONTO FORTE**__: Descrição do ponto de atenção.

---

✅ Checklist do Plantão
- [ ] Tarefa 1 (ex: Repetir PCR).
- [ ] Tarefa 2 (ex: Aguardar parecer da cardiologia).`;

/**
 * Gera um prontuário clínico usando a API do Gemini
 */
export async function generateClinicalReport(
  apiKey: string,
  timeline: TimelineMessage[],
  previousContext?: string,
  additionalInstructions?: string,
  customInstructions?: string
): Promise<AIResponse> {
  if (!apiKey) {
    throw new Error("Chave da API do Gemini não fornecida");
  }

  if (timeline.length === 0) {
    throw new Error("Linha do tempo vazia");
  }

  try {
    // Inicializar o cliente do Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Preparar o conteúdo para envio
    const parts: any[] = [];

    // Adicionar o prompt do sistema
    parts.push({ text: SYSTEM_PROMPT });

    // Adicionar contexto anterior, se fornecido
    if (previousContext) {
      parts.push({
        text: `\n\n[CONTEXTO DO PLANTÃO ANTERIOR (Use para dar seguimento e mostrar a evolução. Compare os dados e atualize o status das terapias e pendências)]:\n---\n${previousContext}\n---\n`,
      });
    }

    // Adicionar a conversa do plantão
    const timelineText = timelineToText(timeline);
    parts.push({
      text: `\n\n[CONVERSA DO PLANTÃO DE HOJE (Esta é a fonte primária de informação para o relatório de hoje)]:\n---\n${timelineText}\n---\n`,
    });

    // Adicionar instruções personalizadas (aprendidas automaticamente)
    if (customInstructions && customInstructions.trim()) {
      parts.push({
        text: `\n\n[PREFERÊNCIAS PERSONALIZADAS (Aprendidas automaticamente dos seus feedbacks anteriores)]:\n---\n${customInstructions}\n---\n`,
      });
    }

    // Adicionar instruções adicionais, se fornecidas
    if (additionalInstructions && additionalInstructions.trim()) {
      parts.push({
        text: `\n\n[INSTRUÇÕES ADICIONAIS DO USUÁRIO (Siga estas orientações com prioridade)]:\n---\n${additionalInstructions}\n---\n`,
      });
    }

    // Adicionar arquivos de mídia (imagens e áudios)
    for (const msg of timeline) {
      if (msg.mediaFile && (msg.type === "image" || msg.type === "audio")) {
        try {
          // Converter File para base64
          const base64 = await fileToBase64(msg.mediaFile);
          const mimeType = msg.mediaFile.type;

          if (msg.type === "image") {
            parts.push({
              inlineData: {
                mimeType,
                data: base64,
              },
            });
            parts.push({
              text: `[IMAGEM anexada na mensagem de ${msg.sender} às ${msg.timestamp}]`,
            });
          } else if (msg.type === "audio") {
            parts.push({
              inlineData: {
                mimeType,
                data: base64,
              },
            });
            parts.push({
              text: `[ÁUDIO anexado na mensagem de ${msg.sender} às ${msg.timestamp}]`,
            });
          }
        } catch (error) {
          console.warn(`Erro ao processar mídia ${msg.mediaFile.name}:`, error);
        }
      }
    }

    // Fazer a chamada à API
    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    // Processar a resposta
    return parseGeminiResponse(text);
  } catch (error) {
    console.error("Erro ao chamar API do Gemini:", error);
    throw new Error(
      `Falha ao gerar prontuário: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    );
  }
}

/**
 * Converte um File para base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover o prefixo "data:mime/type;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Processa a resposta do Gemini e extrai JSON e Markdown
 */
function parseGeminiResponse(text: string): AIResponse {
  try {
    // A resposta deve conter dois blocos de código separados por "-----"
    // Primeiro: JSON, Segundo: Markdown

    // Tentar extrair blocos de código
    const codeBlockRegex = /```(?:json|markdown|md)?\n([\s\S]*?)\n```/g;
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      matches.push(match);
    }

    if (matches.length >= 2) {
      // Primeiro bloco: JSON
      const jsonText = matches[0][1].trim();
      const json = JSON.parse(jsonText);

      // Segundo bloco: Markdown
      const markdown = matches[1][1].trim();

      return { json, markdown };
    }

    // Fallback: tentar dividir por "-----"
    const parts = text.split("-----");
    if (parts.length >= 2) {
      // Tentar extrair JSON do primeiro bloco
      const jsonMatch = parts[0].match(/```(?:json)?\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : parts[0].trim();
      const json = JSON.parse(jsonText);

      // Tentar extrair Markdown do segundo bloco
      const markdownMatch = parts[1].match(/```(?:markdown|md)?\n([\s\S]*?)\n```/);
      const markdown = markdownMatch ? markdownMatch[1].trim() : parts[1].trim();

      return { json, markdown };
    }

    // Se não conseguiu processar, tentar extrair qualquer JSON válido
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      // Usar o texto completo como markdown
      return { json, markdown: text };
    }

    throw new Error("Formato de resposta inválido");
  } catch (error) {
    console.error("Erro ao processar resposta do Gemini:", error);
    throw new Error(
      `Falha ao processar resposta da IA: ${error instanceof Error ? error.message : "Formato inválido"}`
    );
  }
}
