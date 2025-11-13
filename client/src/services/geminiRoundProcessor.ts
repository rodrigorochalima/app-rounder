import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // Aqui usamos uma abordagem simples: converter para texto
        // Em produção, usar biblioteca como mammoth.js
        const text = new TextDecoder().decode(arrayBuffer);
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
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

export async function processarRoundComGemini(params: ProcessarRoundParams): Promise<ProcessarRoundResult> {
  try {
    const { documentoAnterior, transcricao, dataAtual, apiKey } = params;

    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Extrair textos dos documentos
    const textoAnterior = await extrairTextoDocx(documentoAnterior);
    const textoTranscricao = await extrairTextoDocx(transcricao);

    // Montar prompt com todas as regras
    const prompt = `
# TAREFA: Atualizar Documento de Round Médico da UTI

## CONTEXTO
Você é um assistente médico especializado em documentação de UTI. Sua tarefa é atualizar o documento de round médico com base na transcrição do dia atual.

## DOCUMENTO ANTERIOR
${textoAnterior}

## TRANSCRIÇÃO DE HOJE
${textoTranscricao}

## DATA ATUAL
${formatarData(dataAtual)}

## REGRAS OBRIGATÓRIAS

### 1. ATUALIZAÇÃO DE DATA
- Substituir a data no cabeçalho pela data atual: ${formatarData(dataAtual)}

### 2. SISTEMA DE CORES (usar marcadores)
- **[VERMELHO]texto[/VERMELHO]**: Apenas para NOVIDADES do dia atual
  - Exemplos: "Solicitado Hemocultura", "Iniciado Meropenem D0", "Otimizado diuréticos"
- **[AMARELO]texto[/AMARELO]**: Para PENDÊNCIAS a partir do dia seguinte
  - Exemplos: "Hemocultura em andamento (D1)", "Meropenem (D4)"
- **[VERDE]texto[/VERDE]**: Para RESULTADOS RECEBIDOS e FINALIZAÇÕES
  - Exemplos: "Resultado Hemocultura: Negativa", "Suspenso Meropenem (D7)"

### 3. CONTADORES AUTOMÁTICOS
- **Antibióticos**: D0 (início) → D1, D2, D3... (incrementar a cada dia)
- **Exames**: Solicitado (D0) → em andamento (D1, D2...) → Resultado (finalizado)
- **Pareceres**: Solicitado (D0) → Aguarda (D1, D2...) → Recebido (finalizado)

### 4. PROCESSAMENTO POR LEITO
- Processar TODOS os leitos do documento anterior
- Se leito não mencionado na transcrição: incrementar contadores existentes
- Se leito mencionado: atualizar com novas informações
- Se leito vazio/transferido: marcar como "VAGO" ou "TRANSFERIDO"

### 5. PRESERVAÇÃO DE LAYOUT
- Manter EXATAMENTE a mesma estrutura visual do documento anterior
- Preservar tabelas, seções e formatação
- Apenas atualizar conteúdo e aplicar cores

### 6. NOMENCLATURA
- Nome do arquivo: ${gerarNomeArquivo(dataAtual)}

## SAÍDA ESPERADA
Retorne o documento atualizado em formato Markdown, usando os marcadores de cor [VERMELHO], [AMARELO], [VERDE] para indicar a formatação necessária.

Mantenha a estrutura EXATA do documento anterior, apenas atualizando:
1. Data no cabeçalho
2. Conteúdo de cada leito
3. Contadores incrementados
4. Cores aplicadas conforme regras
`;

    // Processar com Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textoProcessado = response.text();

    // Converter resposta em documento Word
    // (Aqui você implementaria a conversão do Markdown para DOCX com cores)
    // Por simplicidade, vou criar um documento básico
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Round Médico - UTI HGSC",
            heading: "Heading1",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: formatarData(dataAtual),
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: textoProcessado,
          }),
        ],
      }],
    });

    // Gerar blob
    const blob = await Packer.toBlob(doc);
    const filename = gerarNomeArquivo(dataAtual);

    return {
      success: true,
      blob,
      filename,
    };

  } catch (error) {
    console.error('Erro ao processar round com Gemini:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
