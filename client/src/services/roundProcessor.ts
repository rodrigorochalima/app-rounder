/**
 * Serviço para processar documentos de round médico
 */
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import PizZip from 'pizzip';
import type { RoundDocument, ProcessingResult } from '../types/round';

/**
 * Extrai texto de um arquivo .docx
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  
  // Extrair document.xml
  const documentXml = zip.file('word/document.xml')?.asText();
  
  if (!documentXml) {
    throw new Error('Arquivo .docx inválido');
  }
  
  // Extrair texto dos elementos <w:t>
  const textMatches = documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  const texts: string[] = [];
  
  for (const match of textMatches) {
    texts.push(match[1]);
  }
  
  return texts.join('');
}

/**
 * Processa documento anterior e transcrição para gerar novo round
 */
export async function processRound(
  documentoAnterior: File,
  transcricao: File,
  data: Date
): Promise<ProcessingResult> {
  try {
    // Extrair textos
    const textoAnterior = await extractTextFromDocx(documentoAnterior);
    const textoTranscricao = await extractTextFromDocx(transcricao);
    
    console.log('Texto anterior extraído:', textoAnterior.substring(0, 500));
    console.log('Transcrição extraída:', textoTranscricao.substring(0, 500));
    
    // TODO: Implementar lógica de processamento
    // Por enquanto, retornar estrutura básica
    
    const document: RoundDocument = {
      id: `round-${Date.now()}`,
      data: formatarData(data),
      dataCompleta: formatarDataCompleta(data),
      leitos: [],
      criadoEm: Date.now()
    };
    
    return {
      success: true,
      document
    };
    
  } catch (error) {
    console.error('Erro ao processar round:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Gera documento Word a partir de RoundDocument
 */
export async function generateDocx(roundDoc: RoundDocument): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Cabeçalho
        new Paragraph({
          text: 'ROUND UTI – HOSPITAL GERAL DE SENADOR CANEDO',
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `DATA ${roundDoc.data}`,
          spacing: { after: 400 }
        }),
        
        // Leitos
        ...roundDoc.leitos.flatMap(leito => [
          new Paragraph({
            children: [
              new TextRun({
                text: `LEITO ${leito.numero} – ${leito.paciente}`,
                bold: true,
                size: 24
              })
            ],
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: leito.diagnostico,
            spacing: { after: 200 }
          })
        ])
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Formata data para DD/MM/YYYY
 */
function formatarData(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata data completa: "QUARTA-FEIRA, 13 DE NOVEMBRO DE 2025"
 */
function formatarDataCompleta(date: Date): string {
  const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  
  const diaSemana = diasSemana[date.getDay()];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  
  return `${diaSemana}, ${dia} DE ${mes} DE ${ano}`;
}

/**
 * Salva documento no histórico (localStorage)
 */
export function saveToHistory(roundDoc: RoundDocument, blob: Blob): void {
  const history = getHistory();
  
  // Converter blob para base64 para armazenar
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result as string;
    
    history.push({
      id: roundDoc.id,
      data: roundDoc.data,
      dataCompleta: roundDoc.dataCompleta,
      leitosCount: roundDoc.leitos.length,
      criadoEm: roundDoc.criadoEm,
      blobBase64: base64
    });
    
    // Manter apenas últimos 50 documentos
    if (history.length > 50) {
      history.shift();
    }
    
    localStorage.setItem('round-history', JSON.stringify(history));
  };
  reader.readAsDataURL(blob);
}

/**
 * Recupera histórico do localStorage
 */
export function getHistory(): any[] {
  const stored = localStorage.getItem('round-history');
  return stored ? JSON.parse(stored) : [];
}

/**
 * Baixa um documento do histórico
 */
export function downloadFromHistory(id: string, filename: string): void {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  
  if (!item || !item.blobBase64) {
    console.error('Documento não encontrado no histórico');
    return;
  }
  
  // Converter base64 de volta para blob
  fetch(item.blobBase64)
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
}
