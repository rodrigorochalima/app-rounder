/**
 * Cliente Supabase
 * Configuração centralizada para acesso ao banco de dados
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://reqkdqislsnzrfgggasy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcWtkcWlzbHNuenJmZ2dnYXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzY3ODEsImV4cCI6MjA3ODcxMjc4MX0.l-pPVRv19QDb1OFYoyIrFdp9EH46s7IXFTX75wqAWTs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// TIPOS
// ============================================

export interface RegraAprendida {
  id: string;
  tipo: 'cor' | 'contador' | 'formatacao' | 'preferencia' | 'contexto';
  descricao: string;
  exemplo?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  usuario_id: string;
}

export interface HistoricoRound {
  id: string;
  nome_arquivo: string;
  data_geracao: string;
  url_storage?: string;
  tamanho_bytes?: number;
  metadados: Record<string, any>;
  usuario_id: string;
  expira_em: string;
}

export interface FeedbackAudio {
  id: string;
  audio_url: string;
  transcricao?: string;
  regras_extraidas: any[];
  processado: boolean;
  erro?: string;
  criado_em: string;
  processado_em?: string;
  usuario_id: string;
}

export interface Instituicao {
  id: string;
  nome: string;
  nome_completo?: string;
  endereco?: string;
  numero_leitos: number;
  logo_url?: string;
  assinatura_url?: string;
  medico_nome?: string;
  medico_crm?: string;
  medico_especialidade?: string;
  template: TemplateCompleto;
  configuracoes: Record<string, any>;
  ativo: boolean;
  padrao: boolean;
  criado_em: string;
  atualizado_em: string;
  usuario_id: string;
}

export interface TemplateCompleto {
  papel: {
    formato: string;
    orientacao: string;
    margens: {
      superior: number;
      inferior: number;
      esquerda: number;
      direita: number;
      unidade: string;
    };
  };
  cabecalho: {
    altura: number;
    mostrar: boolean;
    elementos: any[];
  };
  rodape: {
    altura: number;
    mostrar: boolean;
    elementos: any[];
  };
  cores: {
    vermelho: string;
    amarelo: string;
    verde: string;
    azul: string;
  };
  formatacao: {
    fonte_corpo: string;
    tamanho_corpo: number;
    espacamento_linhas: number;
  };
}

// ============================================
// FUNÇÕES: Regras Aprendidas
// ============================================

export async function buscarRegrasAtivas(): Promise<RegraAprendida[]> {
  const { data, error } = await supabase
    .from('regras_aprendidas')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar regras:', error);
    return [];
  }

  return data || [];
}

export async function adicionarRegra(regra: Omit<RegraAprendida, 'id' | 'criado_em' | 'atualizado_em' | 'usuario_id'>): Promise<RegraAprendida | null> {
  const { data, error } = await supabase
    .from('regras_aprendidas')
    .insert([regra])
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar regra:', error);
    return null;
  }

  return data;
}

export async function desativarRegra(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('regras_aprendidas')
    .update({ ativo: false })
    .eq('id', id);

  if (error) {
    console.error('Erro ao desativar regra:', error);
    return false;
  }

  return true;
}

export async function deletarRegra(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('regras_aprendidas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar regra:', error);
    return false;
  }

  return true;
}

// ============================================
// FUNÇÕES: Histórico de Rounds
// ============================================

export async function buscarHistoricoRecente(limite: number = 30): Promise<HistoricoRound[]> {
  const { data, error } = await supabase
    .from('historico_rounds')
    .select('*')
    .order('data_geracao', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }

  return data || [];
}

export async function salvarRoundNoHistorico(
  nomeArquivo: string,
  urlStorage?: string,
  tamanhoBytes?: number,
  metadados?: Record<string, any>
): Promise<HistoricoRound | null> {
  const { data, error } = await supabase
    .from('historico_rounds')
    .insert([{
      nome_arquivo: nomeArquivo,
      url_storage: urlStorage,
      tamanho_bytes: tamanhoBytes,
      metadados: metadados || {}
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar no histórico:', error);
    return null;
  }

  return data;
}

export async function deletarRoundDoHistorico(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('historico_rounds')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar do histórico:', error);
    return false;
  }

  return true;
}

// ============================================
// FUNÇÕES: Feedbacks de Áudio
// ============================================

export async function salvarFeedbackAudio(audioUrl: string): Promise<FeedbackAudio | null> {
  const { data, error } = await supabase
    .from('feedbacks_audio')
    .insert([{ audio_url: audioUrl }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar feedback:', error);
    return null;
  }

  return data;
}

export async function atualizarFeedbackProcessado(
  id: string,
  transcricao: string,
  regrasExtraidas: any[],
  erro?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('feedbacks_audio')
    .update({
      transcricao,
      regras_extraidas: regrasExtraidas,
      processado: true,
      processado_em: new Date().toISOString(),
      erro
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar feedback:', error);
    return false;
  }

  return true;
}

export async function buscarFeedbacksPendentes(): Promise<FeedbackAudio[]> {
  const { data, error } = await supabase
    .from('feedbacks_audio')
    .select('*')
    .eq('processado', false)
    .order('criado_em', { ascending: true });

  if (error) {
    console.error('Erro ao buscar feedbacks pendentes:', error);
    return [];
  }

  return data || [];
}

// ============================================
// FUNÇÕES: Instituições
// ============================================

export async function buscarInstituicoes(): Promise<Instituicao[]> {
  const { data, error } = await supabase
    .from('instituicoes')
    .select('*')
    .eq('ativo', true)
    .order('padrao', { ascending: false })
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar instituições:', error);
    return [];
  }

  return data || [];
}

export async function buscarInstituicaoPadrao(): Promise<Instituicao | null> {
  const { data, error } = await supabase
    .from('instituicoes')
    .select('*')
    .eq('ativo', true)
    .eq('padrao', true)
    .single();

  if (error) {
    console.error('Erro ao buscar instituição padrão:', error);
    return null;
  }

  return data;
}

export async function buscarInstituicaoPorId(id: string): Promise<Instituicao | null> {
  const { data, error } = await supabase
    .from('instituicoes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar instituição:', error);
    return null;
  }

  return data;
}

export async function salvarInstituicao(instituicao: Omit<Instituicao, 'id' | 'criado_em' | 'atualizado_em' | 'usuario_id'>): Promise<Instituicao | null> {
  const { data, error } = await supabase
    .from('instituicoes')
    .insert([instituicao])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar instituição:', error);
    return null;
  }

  return data;
}

export async function atualizarInstituicao(id: string, atualizacoes: Partial<Instituicao>): Promise<boolean> {
  const { error } = await supabase
    .from('instituicoes')
    .update(atualizacoes)
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar instituição:', error);
    return false;
  }

  return true;
}

export async function deletarInstituicao(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('instituicoes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar instituição:', error);
    return false;
  }

  return true;
}

// ============================================
// FUNÇÕES: Storage (Upload de Arquivos)
// ============================================

export async function uploadLogo(file: File, instituicaoId: string): Promise<string | null> {
  const fileName = `${instituicaoId}/logo_${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Erro ao fazer upload do logo:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function uploadAssinatura(file: File, instituicaoId: string): Promise<string | null> {
  const fileName = `${instituicaoId}/assinatura_${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('assinaturas')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Erro ao fazer upload da assinatura:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('assinaturas')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function uploadAudio(file: Blob): Promise<string | null> {
  const fileName = `feedback_${Date.now()}.webm`;
  
  const { data, error } = await supabase.storage
    .from('audios')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Erro ao fazer upload do áudio:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('audios')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function uploadRound(file: Blob, nomeArquivo: string): Promise<string | null> {
  const fileName = `rounds/${nomeArquivo}`;
  
  const { data, error } = await supabase.storage
    .from('rounds')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Erro ao fazer upload do round:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('rounds')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
