
import { authService } from '../auth';

export interface KnowledgeItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: 'feedback' | 'medical' | 'procedure' | 'diagnosis' | 'treatment' | 'other';
  embedding?: number[];
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSearchResult {
  item: KnowledgeItem;
  similarity: number;
}

class KnowledgeService {
  /**
   * Gera embedding de um texto usando API de embeddings
   * (Pode usar OpenAI, Cohere, ou modelo local)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Por enquanto, vamos usar um embedding simples (TF-IDF like)
      // Em produção, usar OpenAI embeddings ou similar
      
      // Tokenizar e criar vetor simples
      const words = text.toLowerCase().split(/\s+/);
      const wordFreq: Record<string, number> = {};
      
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      // Criar vetor de 384 dimensões (padrão para embeddings)
      const embedding = new Array(384).fill(0);
      
      // Preencher com hash das palavras
      Object.entries(wordFreq).forEach(([word, freq]) => {
        const hash = this.simpleHash(word);
        const index = hash % 384;
        embedding[index] += freq;
      });

      // Normalizar
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / (magnitude || 1));
      
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      throw error;
    }
  }

  /**
   * Hash simples para palavras
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Adiciona conhecimento ao banco
   */
  async addKnowledge(
    title: string,
    content: string,
    category: KnowledgeItem['category'],
    metadata?: Record<string, any>
  ): Promise<KnowledgeItem> {
    try {
      const session = await authService.getCurrentSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Gerar embedding
      const embedding = await this.generateEmbedding(`${title} ${content}`);

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
          user_id: session.user.id,
          title,
          content,
          category,
          embedding,
          metadata,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar conhecimento:', error);
      throw error;
    }
  }

  /**
   * Busca conhecimento por similaridade
   */
  async searchKnowledge(
    query: string,
    limit: number = 5,
    category?: KnowledgeItem['category']
  ): Promise<KnowledgeSearchResult[]> {
    try {
      const session = await authService.getCurrentSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Gerar embedding da query
      const queryEmbedding = await this.generateEmbedding(query);

      // Buscar todos os conhecimentos do usuário
      let query_builder = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      if (category) {
        query_builder = query_builder.eq('category', category);
      }

      const { data, error } = await query_builder;

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Calcular similaridade cosseno
      const results = data.map(item => {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          item.embedding || []
        );
        return { item, similarity };
      });

      // Ordenar por similaridade e retornar top N
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Erro ao buscar conhecimento:', error);
      throw error;
    }
  }

  /**
   * Calcula similaridade cosseno entre dois vetores
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;

    return dotProduct / (mag1 * mag2);
  }

  /**
   * Lista todo o conhecimento do usuário
   */
  async listKnowledge(
    category?: KnowledgeItem['category']
  ): Promise<KnowledgeItem[]> {
    try {
      const session = await authService.getCurrentSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      let query = supabase
        .from('knowledge_base')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar conhecimento:', error);
      throw error;
    }
  }

  /**
   * Atualiza conhecimento
   */
  async updateKnowledge(
    id: string,
    updates: Partial<Pick<KnowledgeItem, 'title' | 'content' | 'category' | 'metadata' | 'is_active'>>
  ): Promise<KnowledgeItem> {
    try {
      // Se título ou conteúdo mudaram, regerar embedding
      let embedding: number[] | undefined;
      if (updates.title || updates.content) {
        const { data: current } = await supabase
          .from('knowledge_base')
          .select('title, content')
          .eq('id', id)
          .single();

        if (current) {
          const newTitle = updates.title || current.title;
          const newContent = updates.content || current.content;
          embedding = await this.generateEmbedding(`${newTitle} ${newContent}`);
        }
      }

      const { data, error } = await supabase
        .from('knowledge_base')
        .update({
          ...updates,
          ...(embedding ? { embedding } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar conhecimento:', error);
      throw error;
    }
  }

  /**
   * Deleta conhecimento
   */
  async deleteKnowledge(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar conhecimento:', error);
      throw error;
    }
  }

  /**
   * Adiciona feedback como conhecimento
   */
  async addFeedbackAsKnowledge(
    roundId: string,
    feedbackText: string
  ): Promise<KnowledgeItem> {
    return this.addKnowledge(
      `Feedback do Round`,
      feedbackText,
      'feedback',
      { round_id: roundId }
    );
  }

  /**
   * Busca conhecimento relevante para geração de round
   */
  async getRelevantKnowledgeForRound(
    patientInfo: string,
    previousRound?: string
  ): Promise<string> {
    try {
      const query = `${patientInfo} ${previousRound || ''}`;
      const results = await this.searchKnowledge(query, 5);

      if (results.length === 0) {
        return '';
      }

      // Formatar conhecimento relevante
      const knowledgeText = results
        .filter(r => r.similarity > 0.3) // Apenas resultados com similaridade > 30%
        .map(r => `- ${r.item.title}: ${r.item.content}`)
        .join('\n');

      return knowledgeText;
    } catch (error) {
      console.error('Erro ao buscar conhecimento relevante:', error);
      return '';
    }
  }
}

export const knowledgeService = new KnowledgeService();
