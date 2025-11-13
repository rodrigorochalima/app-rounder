/**
 * Tipos para o processador de rounds médicos
 */

export interface RoundDocument {
  id: string;
  data: string; // Data no formato DD/MM/YYYY
  dataCompleta: string; // Data completa: "QUARTA-FEIRA, 13 DE NOVEMBRO DE 2025"
  leitos: Leito[];
  criadoEm: number; // timestamp
}

export interface Leito {
  numero: string; // "EXTRA A", "01", "02", etc
  paciente: string;
  idade?: number;
  diagnostico: string;
  antibioticos: Antibiotico[];
  outrasClasses: string[];
  culturas: Cultura[];
  outrosExames: Exame[];
  examesComplementares: string[];
  transferencias: string[];
  pareceres: Parecer[];
  pendencias: string[];
  metaTerapeutica: string[];
}

export interface Antibiotico {
  nome: string;
  dia: number; // Dia do tratamento (0, 1, 2, 3...)
  dataInicio: string; // Data de início no formato DD/MM
  status: 'novo' | 'em_curso' | 'finalizado';
}

export interface Cultura {
  tipo: string; // "Hemocultura", "Urocultura", etc
  status: 'solicitada' | 'pendente' | 'resultado';
  dataSolicitacao: string;
  diasPendente?: number;
  resultado?: string;
}

export interface Exame {
  tipo: string;
  status: 'solicitado' | 'pendente' | 'realizado';
  dataSolicitacao?: string;
  diasPendente?: number;
  resultado?: string;
}

export interface Parecer {
  especialidade: string;
  status: 'solicitado' | 'pendente' | 'recebido';
  dataSolicitacao?: string;
  diasPendente?: number;
  conteudo?: string;
}

export interface ProcessingResult {
  success: boolean;
  document?: RoundDocument;
  error?: string;
}

export interface HistoryItem {
  id: string;
  data: string;
  dataCompleta: string;
  leitosCount: number;
  criadoEm: number;
  blob?: Blob; // Arquivo .docx gerado
}
