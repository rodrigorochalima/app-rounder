-- ============================================
-- SCHEMA INICIAL DO APP ROUNDER
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: regras_aprendidas
-- Armazena regras aprendidas via feedback de áudio
-- ============================================
CREATE TABLE IF NOT EXISTS regras_aprendidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT NOT NULL CHECK (tipo IN ('cor', 'contador', 'formatacao', 'preferencia', 'contexto')),
    descricao TEXT NOT NULL,
    exemplo TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id TEXT DEFAULT 'default',
    
    -- Índices
    CONSTRAINT regras_aprendidas_descricao_check CHECK (length(descricao) > 0)
);

-- Índices para performance
CREATE INDEX idx_regras_tipo ON regras_aprendidas(tipo);
CREATE INDEX idx_regras_ativo ON regras_aprendidas(ativo);
CREATE INDEX idx_regras_usuario ON regras_aprendidas(usuario_id);
CREATE INDEX idx_regras_criado_em ON regras_aprendidas(criado_em DESC);

-- ============================================
-- TABELA: historico_rounds
-- Armazena histórico dos últimos 30 dias de rounds gerados
-- ============================================
CREATE TABLE IF NOT EXISTS historico_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_arquivo TEXT NOT NULL,
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    url_storage TEXT, -- URL do arquivo no Supabase Storage
    tamanho_bytes BIGINT,
    metadados JSONB DEFAULT '{}', -- { leitos_processados: 20, tempo_segundos: 45, etc }
    usuario_id TEXT DEFAULT 'default',
    expira_em TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Índices
    CONSTRAINT historico_rounds_nome_check CHECK (length(nome_arquivo) > 0)
);

-- Índices para performance
CREATE INDEX idx_historico_usuario ON historico_rounds(usuario_id);
CREATE INDEX idx_historico_data ON historico_rounds(data_geracao DESC);
CREATE INDEX idx_historico_expira ON historico_rounds(expira_em);

-- ============================================
-- TABELA: feedbacks_audio
-- Armazena feedbacks em áudio para análise e extração de regras
-- ============================================
CREATE TABLE IF NOT EXISTS feedbacks_audio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_url TEXT NOT NULL, -- URL do áudio no Supabase Storage
    transcricao TEXT,
    regras_extraidas JSONB DEFAULT '[]', -- Array de regras extraídas
    processado BOOLEAN DEFAULT false,
    erro TEXT, -- Mensagem de erro se processamento falhar
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processado_em TIMESTAMP WITH TIME ZONE,
    usuario_id TEXT DEFAULT 'default',
    
    -- Índices
    CONSTRAINT feedbacks_audio_url_check CHECK (length(audio_url) > 0)
);

-- Índices para performance
CREATE INDEX idx_feedbacks_processado ON feedbacks_audio(processado);
CREATE INDEX idx_feedbacks_usuario ON feedbacks_audio(usuario_id);
CREATE INDEX idx_feedbacks_criado_em ON feedbacks_audio(criado_em DESC);

-- ============================================
-- FUNÇÃO: Atualizar timestamp de atualização
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar automaticamente o campo atualizado_em
CREATE TRIGGER update_regras_aprendidas_updated_at
    BEFORE UPDATE ON regras_aprendidas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO: Limpar rounds expirados (>30 dias)
-- ============================================
CREATE OR REPLACE FUNCTION limpar_rounds_expirados()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Deletar rounds que expiraram
    DELETE FROM historico_rounds
    WHERE expira_em < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE regras_aprendidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks_audio ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura para todos (anon)
CREATE POLICY "Permitir leitura pública de regras"
    ON regras_aprendidas FOR SELECT
    USING (true);

CREATE POLICY "Permitir leitura pública de histórico"
    ON historico_rounds FOR SELECT
    USING (true);

CREATE POLICY "Permitir leitura pública de feedbacks"
    ON feedbacks_audio FOR SELECT
    USING (true);

-- Política: Permitir inserção para todos (anon)
CREATE POLICY "Permitir inserção de regras"
    ON regras_aprendidas FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir inserção de histórico"
    ON historico_rounds FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir inserção de feedbacks"
    ON feedbacks_audio FOR INSERT
    WITH CHECK (true);

-- Política: Permitir atualização para todos (anon)
CREATE POLICY "Permitir atualização de regras"
    ON regras_aprendidas FOR UPDATE
    USING (true);

CREATE POLICY "Permitir atualização de feedbacks"
    ON feedbacks_audio FOR UPDATE
    USING (true);

-- Política: Permitir deleção para todos (anon)
CREATE POLICY "Permitir deleção de regras"
    ON regras_aprendidas FOR DELETE
    USING (true);

CREATE POLICY "Permitir deleção de histórico"
    ON historico_rounds FOR DELETE
    USING (true);

-- ============================================
-- CONFIGURAÇÃO DE STORAGE
-- ============================================

-- Criar buckets para armazenar arquivos
-- Nota: Isso deve ser feito via interface do Supabase ou API
-- Buckets necessários:
-- 1. 'rounds' - Para armazenar arquivos .docx gerados
-- 2. 'audios' - Para armazenar feedbacks em áudio

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================

-- Inserir regras iniciais (das especificações)
INSERT INTO regras_aprendidas (tipo, descricao, exemplo) VALUES
    ('cor', 'Vermelho apenas para novidades de HOJE: exames solicitados hoje, antibióticos iniciados hoje (D0), condutas novas', 'Solicitar TC de crânio → VERMELHO'),
    ('cor', 'Amarelo para pendências: exames sem resultado, consultas sem resposta, incrementar contador de dias', 'TC de crânio pendente D2 → AMARELO'),
    ('cor', 'Verde para finalizações: exames com resultado, consultas respondidas, antibióticos suspensos', 'TC de crânio: sem alterações → VERDE'),
    ('cor', 'Azul apenas para títulos de leitos', 'LEITO 01 → AZUL'),
    ('contador', 'Antibióticos: D0 (início) → D1 → D2 → D3... até suspensão', 'Meropenem D0 (hoje) → Meropenem D1 (amanhã)'),
    ('contador', 'Exames pendentes: D0 → D1 → D2... até resultado', 'TC pendente D1 → TC pendente D2'),
    ('contador', 'Consultas pendentes: D0 → D1 → D2... até resposta', 'Aguardando neuro D1 → Aguardando neuro D2'),
    ('formatacao', 'Preservar 100% da formatação do documento anterior: logo, tabelas, fontes, espaçamento', NULL),
    ('formatacao', 'Atualizar data para formato: Dia da semana, DD de mês de YYYY', 'Quinta-feira, 14 de novembro de 2025'),
    ('contexto', 'Não simplificar ou resumir discussões clínicas', NULL),
    ('contexto', 'Manter todos os timestamps da transcrição', NULL),
    ('contexto', 'Incluir todos os pacientes mencionados, mesmo se transferidos ou em leito vazio', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE regras_aprendidas IS 'Armazena regras aprendidas via feedback de áudio para melhorar geração de rounds';
COMMENT ON TABLE historico_rounds IS 'Histórico dos últimos 30 dias de rounds gerados';
COMMENT ON TABLE feedbacks_audio IS 'Feedbacks em áudio enviados pelos usuários para aprendizado contínuo';

COMMENT ON COLUMN regras_aprendidas.tipo IS 'Tipo da regra: cor, contador, formatacao, preferencia, contexto';
COMMENT ON COLUMN regras_aprendidas.ativo IS 'Se false, regra não será incluída nos prompts';
COMMENT ON COLUMN historico_rounds.expira_em IS 'Data de expiração (30 dias após criação)';
COMMENT ON COLUMN feedbacks_audio.processado IS 'Se true, feedback já foi analisado e regras extraídas';
