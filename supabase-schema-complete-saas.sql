-- ============================================
-- APP ROUNDER - SCHEMA COMPLETO SAAS
-- Sistema profissional multi-instituição
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. TABELA DE USUÁRIOS (estende auth.users do Supabase)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  specialty TEXT, -- Especialidade médica
  crm TEXT, -- Registro profissional
  crm_state TEXT,
  is_active BOOLEAN DEFAULT true,
  email_confirmed BOOLEAN DEFAULT false,
  terms_accepted BOOLEAN DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  privacy_accepted BOOLEAN DEFAULT false,
  privacy_accepted_at TIMESTAMPTZ,
  data_collection_consent BOOLEAN DEFAULT false,
  data_collection_consent_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created ON public.users(created_at DESC);

-- ============================================
-- 2. TABELA DE INSTITUIÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly name
  description TEXT,
  logo_url TEXT,
  cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Brasil',
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Configurações
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  language TEXT DEFAULT 'pt-BR',
  
  -- Branding
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  
  -- Features habilitadas
  power_bi_enabled BOOLEAN DEFAULT false,
  knowledge_export_enabled BOOLEAN DEFAULT false, -- Feature paga
  advanced_analytics_enabled BOOLEAN DEFAULT false, -- Feature paga
  
  -- Limites de uso
  max_users INTEGER DEFAULT 5,
  max_rounds_per_month INTEGER DEFAULT 100,
  storage_limit_mb INTEGER DEFAULT 1000,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  subscription_tier TEXT DEFAULT 'free', -- free, basic, pro, enterprise
  subscription_expires_at TIMESTAMPTZ,
  
  -- Owner
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_owner ON public.institutions(owner_id);
CREATE INDEX IF NOT EXISTS idx_institutions_active ON public.institutions(is_active);

-- ============================================
-- 3. TABELA DE MEMBROS (usuários x instituições)
-- ============================================
CREATE TABLE IF NOT EXISTS public.institution_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  
  -- Permissões
  can_manage_members BOOLEAN DEFAULT false,
  can_manage_api_keys BOOLEAN DEFAULT false,
  can_export_data BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES public.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_institution ON public.institution_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.institution_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON public.institution_members(role);

-- ============================================
-- 4. TABELA DE API KEYS (por instituição)
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  
  -- Informações da key
  provider TEXT NOT NULL, -- qwen, cerebras, deepseek, groq, gemini, claude, openai, etc
  name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL, -- Chave criptografada
  encryption_iv TEXT NOT NULL, -- Initialization vector para AES
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Key padrão para este provider
  
  -- Uso e limites
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  monthly_limit INTEGER, -- Limite mensal de chamadas
  cost_per_million_tokens DECIMAL(10,4), -- Custo para tracking
  
  -- Metadados
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(institution_id, provider, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_institution ON public.api_keys(institution_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON public.api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);

-- ============================================
-- 5. TABELA DE ROUNDS (documentos gerados)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Arquivos de entrada
  previous_round_url TEXT, -- URL do documento anterior no storage
  transcription_url TEXT, -- URL da transcrição/áudio no storage
  
  -- Resultado
  generated_document_url TEXT, -- URL do documento gerado no storage
  status TEXT DEFAULT 'processing', -- processing, completed, failed
  
  -- Metadados de geração
  ai_provider_used TEXT, -- Qual AI foi usada
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  cost_estimate DECIMAL(10,6),
  
  -- Análise e insights (para Power BI)
  patient_count INTEGER,
  diagnoses JSONB, -- Array de diagnósticos encontrados
  medications JSONB, -- Medicações mencionadas
  procedures JSONB, -- Procedimentos realizados
  keywords JSONB, -- Palavras-chave extraídas
  
  -- Feedback
  user_rating INTEGER, -- 1-5 estrelas
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_institution ON public.rounds(institution_id);
CREATE INDEX IF NOT EXISTS idx_rounds_user ON public.rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON public.rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_created ON public.rounds(created_at DESC);

-- ============================================
-- 6. TABELA DE CONHECIMENTO VETORIAL
-- ============================================
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  
  -- Conteúdo
  content TEXT NOT NULL,
  content_type TEXT, -- diagnosis, medication, procedure, observation
  
  -- Embedding vetorial (para busca semântica)
  embedding vector(1536), -- OpenAI ada-002 dimension
  
  -- Metadados
  metadata JSONB,
  source TEXT, -- De onde veio este conhecimento
  confidence_score DECIMAL(3,2), -- 0.00 - 1.00
  
  -- Compartilhamento entre instituições
  is_shareable BOOLEAN DEFAULT false,
  shared_with_institutions UUID[], -- Array de IDs de instituições
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_institution ON public.knowledge_base(institution_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON public.knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON public.knowledge_base(created_at DESC);

-- ============================================
-- 7. TABELA DE TERMOS E POLÍTICAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- terms_of_service, privacy_policy, data_consent
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown
  
  is_active BOOLEAN DEFAULT true,
  effective_date TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_type ON public.legal_documents(type);
CREATE INDEX IF NOT EXISTS idx_legal_active ON public.legal_documents(is_active);

-- ============================================
-- 8. TABELA DE ACEITAÇÃO DE TERMOS (audit)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_legal_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  legal_document_id UUID NOT NULL REFERENCES public.legal_documents(id),
  
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, legal_document_id)
);

CREATE INDEX IF NOT EXISTS idx_acceptances_user ON public.user_legal_acceptances(user_id);

-- ============================================
-- 9. TABELA DE LOGS DE AUDITORIA
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  institution_id UUID REFERENCES public.institutions(id),
  
  action TEXT NOT NULL, -- login, logout, create_round, update_api_key, etc
  resource_type TEXT, -- user, institution, round, api_key
  resource_id UUID,
  
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_institution ON public.audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================
-- 10. TABELA DE EXPORTAÇÕES (feature paga)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  export_type TEXT NOT NULL, -- knowledge_base, rounds, analytics, power_bi
  format TEXT NOT NULL, -- json, csv, excel, pdf
  
  -- Filtros aplicados
  filters JSONB,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  
  -- Resultado
  file_url TEXT,
  file_size_mb DECIMAL(10,2),
  status TEXT DEFAULT 'processing', -- processing, completed, failed
  
  -- Billing (se for feature paga)
  is_paid_export BOOLEAN DEFAULT false,
  cost DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_institution ON public.exports(institution_id);
CREATE INDEX IF NOT EXISTS idx_exports_user ON public.exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON public.exports(status);

-- ============================================
-- 11. VIEWS PARA ANALYTICS E POWER BI
-- ============================================

-- View: Estatísticas por instituição
CREATE OR REPLACE VIEW public.institution_stats AS
SELECT 
  i.id as institution_id,
  i.name as institution_name,
  COUNT(DISTINCT im.user_id) as total_users,
  COUNT(DISTINCT r.id) as total_rounds,
  SUM(r.tokens_used) as total_tokens_used,
  SUM(r.cost_estimate) as total_cost,
  AVG(r.user_rating) as avg_rating,
  COUNT(DISTINCT DATE(r.created_at)) as active_days,
  MAX(r.created_at) as last_round_at
FROM public.institutions i
LEFT JOIN public.institution_members im ON i.id = im.institution_id
LEFT JOIN public.rounds r ON i.id = r.institution_id
WHERE i.is_active = true
GROUP BY i.id, i.name;

-- View: Uso de APIs por instituição
CREATE OR REPLACE VIEW public.api_usage_stats AS
SELECT 
  ak.institution_id,
  ak.provider,
  COUNT(*) as key_count,
  SUM(ak.usage_count) as total_usage,
  MAX(ak.last_used_at) as last_used
FROM public.api_keys ak
WHERE ak.is_active = true
GROUP BY ak.institution_id, ak.provider;

-- View: Rounds por usuário
CREATE OR REPLACE VIEW public.user_round_stats AS
SELECT 
  u.id as user_id,
  u.full_name,
  u.email,
  COUNT(r.id) as total_rounds,
  AVG(r.user_rating) as avg_rating,
  SUM(r.tokens_used) as total_tokens,
  MAX(r.created_at) as last_round_at
FROM public.users u
LEFT JOIN public.rounds r ON u.id = r.user_id
GROUP BY u.id, u.full_name, u.email;

-- ============================================
-- 12. FUNCTIONS E TRIGGERS
-- ============================================

-- Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Criar instituição padrão ao criar usuário
CREATE OR REPLACE FUNCTION create_default_institution_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_institution_id UUID;
BEGIN
  -- Criar instituição pessoal
  INSERT INTO public.institutions (name, slug, owner_id)
  VALUES (
    NEW.full_name || ' - Instituição Pessoal',
    'personal-' || REPLACE(LOWER(NEW.email), '@', '-'),
    NEW.id
  )
  RETURNING id INTO new_institution_id;
  
  -- Adicionar usuário como owner da instituição
  INSERT INTO public.institution_members (institution_id, user_id, role, can_manage_members, can_manage_api_keys, can_export_data, joined_at)
  VALUES (new_institution_id, NEW.id, 'owner', true, true, true, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_institution AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION create_default_institution_for_user();

-- ============================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Usuários podem ver e editar seus próprios dados
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policies: Membros podem ver dados de suas instituições
CREATE POLICY "Members can view institution data" ON public.institutions
  FOR SELECT USING (
    id IN (
      SELECT institution_id FROM public.institution_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policies: API Keys visíveis apenas para membros com permissão
CREATE POLICY "Members can view api keys" ON public.api_keys
  FOR SELECT USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policies: Rounds visíveis para membros da instituição
CREATE POLICY "Members can view rounds" ON public.rounds
  FOR SELECT USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 14. DADOS INICIAIS (SEED)
-- ============================================

-- Inserir termos de uso e política de privacidade
INSERT INTO public.legal_documents (type, version, title, content, effective_date) VALUES
('terms_of_service', '1.0', 'Termos de Uso do App Rounder', 
'# Termos de Uso

Ao utilizar o App Rounder, você concorda com os seguintes termos...

[Conteúdo completo dos termos]', 
NOW()),

('privacy_policy', '1.0', 'Política de Privacidade', 
'# Política de Privacidade

O App Rounder respeita sua privacidade e está comprometido com a proteção dos seus dados pessoais...

[Conteúdo completo da política]', 
NOW()),

('data_consent', '1.0', 'Consentimento para Coleta de Dados', 
'# Consentimento de Dados

Solicitamos seu consentimento para coletar e processar os seguintes dados:

- Dados de uso do aplicativo
- Documentos médicos processados
- Estatísticas de geração de rounds

Estes dados serão utilizados para melhorar o serviço e gerar insights.', 
NOW());

-- ============================================
-- FIM DO SCHEMA
-- ============================================

-- Comentários nas tabelas
COMMENT ON TABLE public.users IS 'Usuários do sistema (médicos e profissionais de saúde)';
COMMENT ON TABLE public.institutions IS 'Instituições de saúde (hospitais, clínicas, consultórios)';
COMMENT ON TABLE public.institution_members IS 'Relacionamento usuários x instituições';
COMMENT ON TABLE public.api_keys IS 'Chaves de API para serviços de IA (por instituição)';
COMMENT ON TABLE public.rounds IS 'Rounds médicos gerados pelo sistema';
COMMENT ON TABLE public.knowledge_base IS 'Base de conhecimento vetorial para busca semântica';
COMMENT ON TABLE public.legal_documents IS 'Termos de uso, políticas e documentos legais';
COMMENT ON TABLE public.audit_logs IS 'Logs de auditoria para compliance';
COMMENT ON TABLE public.exports IS 'Exportações de dados (feature paga)';
