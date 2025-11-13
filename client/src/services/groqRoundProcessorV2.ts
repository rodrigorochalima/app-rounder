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

// Extrair texto de arquivo DOCX
async function extrairTextoDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Formatar data
function formatarData(data: Date): string {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  return `${dias[data.getDay()]}, ${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
}

// Gerar nome do arquivo
function gerarNomeArquivo(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = String(data.getFullYear()).slice(-2);
  return `Round ${dia}${mes}${ano}.docx`;
}

// Dividir documento em leitos
function dividirPorLeitos(texto: string): { [key: string]: string } {
  const leitos: { [key: string]: string } = {};
  const linhas = texto.split('\n');
  let leitoAtual = 'CABECALHO';
  let conteudoAtual: string[] = [];

  for (const linha of linhas) {
    const matchLeito = linha.match(/^(EXTRA [A-Z]|LEITO \d+)/i);
    
    if (matchLeito) {
      // Salvar leito anterior
      if (conteudoAtual.length > 0) {
        leitos[leitoAtual] = conteudoAtual.join('\n');
      }
      
      // Iniciar novo leito
      leitoAtual = matchLeito[1].toUpperCase();
      conteudoAtual = [linha];
    } else {
      conteudoAtual.push(linha);
    }
  }

  // Salvar último leito
  if (conteudoAtual.length > 0) {
    leitos[leitoAtual] = conteudoAtual.join('\n');
  }

  return leitos;
}

// Processar um leito individual
async function processarLeito(
  groq: Groq,
  nomeLeito: string,
  conteudoAnterior: string,
  transcricaoCompleta: string,
  dataAtual: string
): Promise<string> {
  const prompt = `Você é assistente médico especializado em UTI.

TAREFA: Atualizar o leito "${nomeLeito}" do round médico.

CONTEÚDO ANTERIOR DO LEITO:
${conteudoAnterior}

TRANSCRIÇÃO COMPLETA DE HOJE (busque informações sobre este leito):
${transcricaoCompleta.substring(0, 3000)} [...]

DATA ATUAL: ${dataAtual}

REGRAS:
1. Atualize a data para: ${dataAtual}
2. Use marcadores para cores:
   - [VERMELHO]texto[/VERMELHO] para NOVIDADES (novos exames, antibióticos, condutas)
   - [AMARELO]texto[/AMARELO] para PENDÊNCIAS (exames aguardando resultado, antibióticos em curso)
   - [VERDE]texto[/VERDE] para FINALIZAÇÕES (resultados recebidos, antibióticos suspensos)
3. Incremente contadores: D0→D1, D1→D2, etc
4. Se o leito não foi mencionado na transcrição, apenas incremente contadores existentes
5. Mantenha a estrutura original do leito
6. Seja conciso e objetivo

RESPONDA APENAS COM O CONTEÚDO ATUALIZADO DO LEITO, SEM EXPLICAÇÕES.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Você é um assistente médico preciso e objetivo.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || conteudoAnterior;
}

// Criar documento Word
function criarDocumentoWord(textoProcessado: string): Document {
  const linhas = textoProcessado.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const linha of linhas) {
    if (!linha.trim()) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    const isTitulo = linha.startsWith('#') || (linha === linha.toUpperCase() && linha.length < 50);
    const runs: TextRun[] = [];
    let textoRestante = linha.replace(/^#+\s*/, '');

    // Processar marcadores
    const regex = /\[(VERMELHO|AMARELO|VERDE)\](.*?)\[\/\1\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(textoRestante)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun({ text: textoRestante.substring(lastIndex, match.index) }));
      }

      const cor = match[1];
      const texto = match[2];
      
      if (cor === 'VERMELHO') {
        runs.push(new TextRun({ text: texto, color: 'FF0000', bold: true }));
      } else if (cor === 'AMARELO') {
        runs.push(new TextRun({ text: texto, color: 'FFBF00', underline: {} }));
      } else if (cor === 'VERDE') {
        runs.push(new TextRun({ text: texto, color: '008000' }));
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < textoRestante.length) {
      runs.push(new TextRun({ text: textoRestante.substring(lastIndex) }));
    }

    paragraphs.push(new Paragraph({
      children: runs.length > 0 ? runs : [new TextRun({ text: textoRestante })],
      heading: isTitulo ? HeadingLevel.HEADING_2 : undefined,
      alignment: isTitulo ? AlignmentType.CENTER : AlignmentType.LEFT,
    }));
  }

  return new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });
}

export async function processarRoundComGroqV2(params: ProcessarRoundParams): Promise<ProcessarRoundResult> {
  try {
    const { documentoAnterior, transcricao, dataAtual, apiKey } = params;

    const groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    // Extrair textos
    const textoAnterior = await extrairTextoDocx(documentoAnterior);
    const textoTranscricao = await extrairTextoDocx(transcricao);
    const dataFormatada = formatarData(dataAtual);

    // Dividir em leitos
    const leitosAnteriores = dividirPorLeitos(textoAnterior);
    const leitosProcessados: string[] = [];

    // Processar cabeçalho (atualizar data)
    if (leitosAnteriores['CABECALHO']) {
      const cabecalhoAtualizado = leitosAnteriores['CABECALHO'].replace(
        /\w+,\s+\d+\s+de\s+\w+\s+de\s+\d+/gi,
        dataFormatada
      );
      leitosProcessados.push(cabecalhoAtualizado);
    }

    // Processar cada leito
    for (const [nomeLeito, conteudo] of Object.entries(leitosAnteriores)) {
      if (nomeLeito === 'CABECALHO') continue;

      const leitoAtualizado = await processarLeito(
        groq,
        nomeLeito,
        conteudo,
        textoTranscricao,
        dataFormatada
      );

      leitosProcessados.push(leitoAtualizado);
    }

    // Juntar tudo
    const textoFinal = leitosProcessados.join('\n\n');

    // Criar documento
    const doc = criarDocumentoWord(textoFinal);
    const blob = await Packer.toBlob(doc);
    const filename = gerarNomeArquivo(dataAtual);

    return { success: true, blob, filename };

  } catch (error) {
    console.error('Erro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
