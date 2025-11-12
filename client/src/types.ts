// Tipos para mensagens da linha do tempo
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'system';

export interface TimelineMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: string; // HH:MM
  fullDate: string; // YYYY-MM-DD
  sender: string;
  mediaFile?: File;
  mediaUrl?: string;
}

// Tipos para filtros de período
export type PeriodFilter = 'today' | 'todayAndYesterday' | 'all';

// Tipos para o prontuário gerado
export interface Antibiotic {
  nome: string;
  status: 'EM_USO' | 'SUSPENSO';
  dias: string;
}

export interface PendingExam {
  tipo: string;
  data_pedido: string;
}

export interface BedReport {
  leito: string;
  paciente: string;
  resumo_clinico: string;
  antibioticos: Antibiotic[];
  terapias_nao_atb: string[];
  exames_pendentes: PendingExam[];
  plano_cuidados: string[];
  linha_do_tempo_eventos: string[];
  pontos_de_atencao: string[];
}

export interface ClinicalReport {
  data_referencia: string;
  leitos: BedReport[];
}

// Tipo para o resultado da IA
export interface AIResponse {
  json: ClinicalReport;
  markdown: string;
}

// Tipo para histórico salvo
export interface SavedReport {
  id: string;
  timestamp: string; // ISO string
  dateReference: string; // YYYY-MM-DD
  report: AIResponse;
  filterUsed: PeriodFilter;
  feedback?: 'positive' | 'negative' | null;
  wasUsedAsTemplate?: boolean;
}

// Tipo para preferências do usuário (aprendizado automático)
export interface UserPreferences {
  apiKey: string;
  autoLearn: boolean; // Se deve aprender automaticamente com feedbacks
  stylePatterns: {
    preferredSections: string[]; // Seções que o usuário sempre aprova
    avoidedPhrases: string[]; // Frases que o usuário não gosta
    preferredFormat: string; // Formato preferido (detalhado, objetivo, etc)
  };
  customInstructions: string; // Instruções globais personalizadas
}

// Tipo para o estado da aplicação
export interface AppState {
  // Dados do ZIP
  fullTimeline: TimelineMessage[];
  filteredTimeline: TimelineMessage[];
  currentFilter: PeriodFilter;
  
  // Contexto e instruções
  selectedContextId: string | null;
  additionalInstructions: string;
  
  // Resultado
  currentResult: AIResponse | null;
  
  // Estados de UI
  isProcessingZip: boolean;
  isGenerating: boolean;
  
  // Histórico
  savedReports: SavedReport[];
  
  // Preferências e aprendizado
  preferences: UserPreferences;
}
