-- ============================================
-- TABELA: instituicoes
-- Armazena configurações de instituições e templates
-- ============================================

CREATE TABLE IF NOT EXISTS instituicoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informações Básicas
    nome TEXT NOT NULL,
    nome_completo TEXT,
    endereco TEXT,
    numero_leitos INTEGER DEFAULT 20 CHECK (numero_leitos > 0 AND numero_leitos <= 100),
    
    -- Arquivos
    logo_url TEXT,
    assinatura_url TEXT,
    
    -- Informações do Médico Responsável
    medico_nome TEXT,
    medico_crm TEXT,
    medico_especialidade TEXT DEFAULT 'Medicina Intensiva',
    
    -- Template Completo (JSON)
    template JSONB NOT NULL DEFAULT '{
        "papel": {
            "formato": "A4",
            "orientacao": "retrato",
            "margens": {
                "superior": 2.5,
                "inferior": 2.5,
                "esquerda": 3.0,
                "direita": 2.0,
                "unidade": "cm"
            }
        },
        "cabecalho": {
            "altura": 3.0,
            "mostrar": true,
            "elementos": []
        },
        "rodape": {
            "altura": 2.5,
            "mostrar": true,
            "elementos": []
        },
        "cores": {
            "vermelho": "#FF0000",
            "amarelo": "#FFA500",
            "verde": "#008000",
            "azul": "#0000FF"
        },
        "formatacao": {
            "fonte_corpo": "Arial",
            "tamanho_corpo": 11,
            "espacamento_linhas": 1.15
        }
    }',
    
    -- Configurações Adicionais
    configuracoes JSONB DEFAULT '{}',
    
    -- Controle
    ativo BOOLEAN DEFAULT true,
    padrao BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id TEXT DEFAULT 'default',
    
    -- Constraints
    CONSTRAINT instituicoes_nome_check CHECK (length(nome) > 0),
    CONSTRAINT instituicoes_um_padrao_por_usuario UNIQUE (usuario_id, padrao) WHERE padrao = true
);

-- Índices
CREATE INDEX idx_instituicoes_usuario ON instituicoes(usuario_id);
CREATE INDEX idx_instituicoes_ativo ON instituicoes(ativo);
CREATE INDEX idx_instituicoes_padrao ON instituicoes(padrao);

-- Trigger para atualizar timestamp
CREATE TRIGGER update_instituicoes_updated_at
    BEFORE UPDATE ON instituicoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

ALTER TABLE instituicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de instituições"
    ON instituicoes FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserção de instituições"
    ON instituicoes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir atualização de instituições"
    ON instituicoes FOR UPDATE
    USING (true);

CREATE POLICY "Permitir deleção de instituições"
    ON instituicoes FOR DELETE
    USING (true);

-- ============================================
-- DADOS INICIAIS: Sanador Caneto
-- ============================================

INSERT INTO instituicoes (
    nome,
    nome_completo,
    numero_leitos,
    medico_nome,
    medico_crm,
    padrao,
    template
) VALUES (
    'Sanador Caneto',
    'Hospital Sanador Caneto - UTI Adulto',
    20,
    'Dr. Rodrigo Rocha Lima',
    'CRM: 12345-SP',
    true,
    '{
        "papel": {
            "formato": "A4",
            "orientacao": "retrato",
            "margens": {
                "superior": 2.5,
                "inferior": 2.5,
                "esquerda": 3.0,
                "direita": 2.0,
                "unidade": "cm"
            }
        },
        "cabecalho": {
            "altura": 3.0,
            "mostrar": true,
            "elementos": [
                {
                    "tipo": "titulo",
                    "mostrar": true,
                    "texto": "HOSPITAL SANADOR CANETO",
                    "fonte": "Arial",
                    "tamanho": 16,
                    "negrito": true,
                    "cor": "#000000",
                    "alinhamento": "centro"
                },
                {
                    "tipo": "subtitulo",
                    "mostrar": true,
                    "texto": "UTI Adulto - 20 Leitos",
                    "fonte": "Arial",
                    "tamanho": 12,
                    "cor": "#666666",
                    "alinhamento": "centro"
                },
                {
                    "tipo": "data",
                    "mostrar": true,
                    "formato": "Dia da semana, DD de mês de YYYY",
                    "fonte": "Arial",
                    "tamanho": 11,
                    "alinhamento": "centro"
                },
                {
                    "tipo": "linha_separadora",
                    "mostrar": true,
                    "estilo": "solida",
                    "cor": "#CCCCCC",
                    "espessura": 1
                }
            ]
        },
        "rodape": {
            "altura": 2.5,
            "mostrar": true,
            "elementos": [
                {
                    "tipo": "linha_separadora",
                    "mostrar": true,
                    "estilo": "solida",
                    "cor": "#CCCCCC",
                    "espessura": 1
                },
                {
                    "tipo": "medico",
                    "mostrar": true,
                    "nome": "Dr. Rodrigo Rocha Lima",
                    "crm": "CRM: 12345-SP",
                    "fonte": "Arial",
                    "tamanho_nome": 11,
                    "tamanho_crm": 10,
                    "negrito_nome": true,
                    "alinhamento": "esquerda"
                },
                {
                    "tipo": "numero_pagina",
                    "mostrar": true,
                    "formato": "Página X de Y",
                    "fonte": "Arial",
                    "tamanho": 9,
                    "alinhamento": "centro"
                }
            ]
        },
        "cores": {
            "vermelho": "#FF0000",
            "amarelo": "#FFA500",
            "verde": "#008000",
            "azul": "#0000FF"
        },
        "formatacao": {
            "fonte_corpo": "Arial",
            "tamanho_corpo": 11,
            "espacamento_linhas": 1.15
        }
    }'
) ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE instituicoes IS 'Armazena configurações de instituições e templates personalizados';
COMMENT ON COLUMN instituicoes.template IS 'Template completo em JSON com configurações de cabeçalho, rodapé, cores e formatação';
COMMENT ON COLUMN instituicoes.padrao IS 'Se true, esta é a instituição padrão do usuário (apenas uma por usuário)';
COMMENT ON COLUMN instituicoes.logo_url IS 'URL do logo da instituição no Supabase Storage';
COMMENT ON COLUMN instituicoes.assinatura_url IS 'URL da assinatura digital do médico no Supabase Storage';
