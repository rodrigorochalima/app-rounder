import Groq from 'groq-sdk';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import mammoth from 'mammoth';

export interface ProcessarRoundParams {
  documentoAnterior: File;
  transcricao: File;
  dataAtual: Date;
  apiKey: string;
}

export interface ProcessarRoundResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// Extrair texto de arquivo DOCX usando mammoth
async function extrairTextoDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Formatar data no padrão brasileiro
function formatarData(data: Date): string {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const diaSemana = dias[data.getDay()];
  const dia = data.getDate();
  const mes = meses[data.getMonth()];
  const ano = data.getFullYear();
  
  return `${diaSemana}, ${dia} de ${mes} de ${ano}`;
}

// Gerar nome do arquivo no formato Round DDMMYY
function gerarNomeArquivo(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear()).slice(-2);
  return `Round ${dia}${mes}${ano}.docx`;
}

// Criar documento Word a partir do texto processado
function criarDocumentoWord(textoProcessado: string, dataAtual: Date): Document {
  const linhas = textoProcessado.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const linha of linhas) {
    if (!linha.trim()) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // Detectar se é título (começa com # ou está em MAIÚSCULAS)
    const isTitulo = linha.startsWith('#') || (linha === linha.toUpperCase() && linha.length < 50);
    
    const runs: TextRun[] = [];
    let textoRestante = linha.replace(/^#+\s*/, ''); // Remover # do markdown

    // Processar marcadores de cor
    const regex = /\[(VERMELHO|AMARELO|VERDE)\](.*?)\[\/\1\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(textoRestante)) !== null) {
      // Texto antes do marcador
      if (match.index > lastIndex) {
        runs.push(new TextRun({ text: textoRestante.substring(lastIndex, match.index) }));
      }

      // Texto com cor
      const cor = match[1];
      const texto = match[2];
      
      if (cor === 'VERMELHO') {
        runs.push(new TextRun({
          text: texto,
          color: 'FF0000',
          bold: true,
        }));
      } else if (cor === 'AMARELO') {
        runs.push(new TextRun({
          text: texto,
          color: 'FFBF00',
          underline: {},
        }));
      } else if (cor === 'VERDE') {
        runs.push(new TextRun({
          text: texto,
          color: '008000',
        }));
      }

      lastIndex = regex.lastIndex;
    }

    // Texto restante
    if (lastIndex < textoRestante.length) {
      runs.push(new TextRun({ text: textoRestante.substring(lastIndex) }));
    }

    // Criar parágrafo
    const paragrafo = new Paragraph({
      children: runs.length > 0 ? runs : [new TextRun({ text: textoRestante })],
      heading: isTitulo ? HeadingLevel.HEADING_2 : undefined,
      alignment: isTitulo ? AlignmentType.CENTER : AlignmentType.LEFT,
    });

    paragraphs.push(paragrafo);
  }

  return new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
}

export async function processarRoundComGroq(params: ProcessarRoundParams): Promise<ProcessarRoundResult> {
  try {
    const { documentoAnterior, transcricao, dataAtual, apiKey } = params;

    // Inicializar Groq
    const groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Necessário para uso no browser
    });

    // Extrair textos dos documentos
    const textoAnterior = await extrairTextoDocx(documentoAnterior);
    const textoTranscricao = await extrairTextoDocx(transcricao);

    // Montar prompt otimizado (reduzido)
    const prompt = `# TAREFA: Atualizar Round Médico da UTI

## CONTEXTO
Você é um assistente médico especializado em documentação de UTI do Hospital Geral de Senador Canedo. 
Sua tarefa é atualizar o documento de round médico com base na transcrição do dia atual, aplicando regras rigorosas de formatação e análise contextual.

## DOCUMENTO ANTERIOR
${textoAnterior}

## TRANSCRIÇÃO DE HOJE
${textoTranscricao}

## DATA ATUAL
${formatarData(dataAtual)}

## REGRAS OBRIGATÓRIAS

### 1. ATUALIZAÇÃO DE DATA
- Substituir TODA ocorrência de data no documento pela data atual: ${formatarData(dataAtual)}

### 2. SISTEMA DE CORES (usar marcadores textuais)
Use estes marcadores para indicar formatação:

- **[VERMELHO]texto[/VERMELHO]**: APENAS para NOVIDADES do dia atual
  Exemplos:
  * [VERMELHO]Solicitado Hemocultura[/VERMELHO]
  * [VERMELHO]Iniciado Meropenem D0[/VERMELHO]
  * [VERMELHO]Otimizado diuréticos[/VERMELHO]
  * [VERMELHO]Solicitado parecer Nefrologia[/VERMELHO]

- **[AMARELO]texto[/AMARELO]**: Para PENDÊNCIAS a partir do dia seguinte
  Exemplos:
  * [AMARELO]Hemocultura em andamento (D1)[/AMARELO]
  * [AMARELO]Meropenem (D4)[/AMARELO]
  * [AMARELO]Aguarda parecer Nefrologia (D2)[/AMARELO]

- **[VERDE]texto[/VERDE]**: Para RESULTADOS RECEBIDOS e FINALIZAÇÕES
  Exemplos:
  * [VERDE]Resultado Hemocultura: Negativa[/VERDE]
  * [VERDE]Suspenso Meropenem (D7)[/VERDE]
  * [VERDE]Parecer Nefrologia recebido[/VERDE]

### 3. CONTADORES AUTOMÁTICOS
- **Antibióticos**: 
  * Dia de início: D0 (vermelho)
  * Dias seguintes: D1, D2, D3... (amarelo até suspensão)
  * Suspensão: (DX) (verde)

- **Exames**: 
  * Solicitação: "Solicitado EXAME" (vermelho)
  * Dias seguintes: "EXAME em andamento (D1, D2...)" (amarelo)
  * Resultado: "Resultado EXAME: ..." (verde)

- **Pareceres**: 
  * Solicitação: "Solicitado parecer ESPECIALIDADE" (vermelho)
  * Dias seguintes: "Aguarda parecer ESPECIALIDADE (D1, D2...)" (amarelo)
  * Recebido: "Parecer ESPECIALIDADE recebido" (verde)

### 4. PROCESSAMENTO POR LEITO
- Processar TODOS os leitos do documento anterior
- Se leito NÃO mencionado na transcrição: 
  * Manter conteúdo anterior
  * Incrementar contadores existentes (D1→D2, D2→D3, etc)
  * Aplicar amarelo em contadores
- Se leito mencionado: 
  * Atualizar com novas informações
  * Aplicar cores conforme regras
  * Resolver conflitos de informação (priorizar transcrição mais recente)
- Se leito vazio/transferido: marcar como "VAGO" ou "TRANSFERIDO"

### 5. RESOLUÇÃO DE CONFLITOS
- Se houver informações contraditórias, priorizar a transcrição mais recente
- Se dois pacientes forem mencionados no mesmo leito, considerar o primeiro correto e sinalizar o segundo como "VERIFICAR: possível erro de transcrição"
- Sempre incluir todos os pacientes mencionados, mesmo com conflitos

### 6. PRESERVAÇÃO DE LAYOUT
- Manter EXATAMENTE a mesma estrutura do documento anterior
- Preservar todas as seções (EXTRA A, LEITO 01, LEITO 02, etc)
- Preservar hierarquia e organização
- Apenas atualizar conteúdo textual

### 7. ANÁLISE CONTEXTUAL
- Identificar automaticamente novos exames, antibióticos, condutas
- Correlacionar informações entre leitos se necessário
- Detectar padrões e tendências (ex: mesmo antibiótico em múltiplos leitos)
- Sugerir alertas para informações críticas

### 8. IMPORTANTE
- NUNCA omitir leitos
- SEMPRE incrementar contadores de pendências
- Aplicar cores APENAS conforme as regras acima
- Manter fidelidade ao layout original
- Resolver ambiguidades de forma inteligente

## FORMATO DE SAÍDA
Retorne o documento completo em formato texto simples, usando os marcadores [VERMELHO], [AMARELO], [VERDE] 
para indicar onde aplicar as cores. Mantenha toda a estrutura e seções do documento original.

Comece com o cabeçalho atualizado e processe todos os leitos em ordem.`;

    // Processar com Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente médico especializado em documentação de UTI. Você analisa contexto, resolve conflitos e aplica regras de formatação com precisão.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-70b-versatile', // Modelo com contexto de 128k tokens
      temperature: 0.3, // Baixa temperatura para maior precisão
      max_tokens: 4000,
    });

    const textoProcessado = completion.choices[0]?.message?.content || '';

    if (!textoProcessado) {
      throw new Error('Resposta vazia da API Groq');
    }

    // Criar documento Word
    const doc = criarDocumentoWord(textoProcessado, dataAtual);

    // Gerar blob
    const blob = await Packer.toBlob(doc);
    const filename = gerarNomeArquivo(dataAtual);

    return {
      success: true,
      blob,
      filename,
    };

  } catch (error) {
    console.error('Erro ao processar round com Groq:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
