-- ============================================================================
-- NEXO SOLUÇÕES DIGITAIS - APP ROUNDER
-- Schema Completo do Banco de Dados
-- ============================================================================

-- Limpar tabelas existentes (se necessário)
DROP TABLE IF EXISTS bed_assignments CASCADE;
DROP TABLE IF EXISTS sub_areas CASCADE;
DROP TABLE IF EXISTS institution_rules CASCADE;
DROP TABLE IF EXISTS api_usage_logs CASCADE;
DROP TABLE IF EXISTS institution_api_keys CASCADE;
DROP TABLE IF EXISTS institution_members CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS terms_acceptance CASCADE;
DROP TABLE IF EXISTS power_bi_exports CASCADE;
DROP TABLE IF EXISTS epimed_integrations CASCADE;

-- ============================================================================
-- 1. PERFIS DE USUÁRIO
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  crm TEXT,
  crm_state TEXT,
  specialty TEXT,
  role TEXT CHECK (role IN ('rotineiro', 'diarista', 'coordenador', 'admin')) DEFAULT 'rotineiro',
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INSTITUIÇÕES (MATRIZ)
-- ============================================================================

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logo_url TEXT,
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. SUBÁREAS (UTIs, Enfermarias, etc)
-- ============================================================================

CREATE TABLE sub_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('uti', 'enfermaria', 'emergencia', 'ambulatorio', 'outro')) NOT NULL,
  total_beds INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, name)
);

-- ============================================================================
-- 4. LEITOS
-- ============================================================================

CREATE TABLE bed_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_area_id UUID REFERENCES sub_areas(id) ON DELETE CASCADE NOT NULL,
  bed_number TEXT NOT NULL,
  patient_name TEXT,
  patient_id TEXT,
  status TEXT CHECK (status IN ('ocupado', 'livre', 'bloqueado', 'higienizacao')) DEFAULT 'livre',
  notes TEXT,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sub_area_id, bed_number)
);

-- ============================================================================
-- 5. MEMBROS DA INSTITUIÇÃO
-- ============================================================================

CREATE TABLE institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'coordenador', 'diarista', 'rotineiro', 'viewer')) NOT NULL,
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, user_id)
);

-- ============================================================================
-- 6. API KEYS (3 SIMULTÂNEAS)
-- ============================================================================

CREATE TABLE institution_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  slot INTEGER CHECK (slot IN (1, 2, 3)) NOT NULL,
  provider TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT CHECK (status IN ('online', 'offline', 'error')) DEFAULT 'offline',
  last_checked_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, slot)
);

-- ============================================================================
-- 7. REGRAS (16-40 POR INSTITUIÇÃO)
-- ============================================================================

CREATE TABLE institution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  rule_number INTEGER NOT NULL CHECK (rule_number BETWEEN 1 AND 40),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, rule_number)
);

-- ============================================================================
-- 8. LOGS DE USO DE API
-- ============================================================================

CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  api_key_id UUID REFERENCES institution_api_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  endpoint TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'error', 'timeout')) NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. ACEITE DE TERMOS E LGPD
-- ============================================================================

CREATE TABLE terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, terms_version)
);

-- ============================================================================
-- 10. EXPORTAÇÕES POWER BI
-- ============================================================================

CREATE TABLE power_bi_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  export_type TEXT NOT NULL,
  file_url TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  records_count INTEGER DEFAULT 0,
  requested_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. INTEGRAÇÕES EPIMED
-- ============================================================================

CREATE TABLE epimed_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
  api_endpoint TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily')) DEFAULT 'hourly',
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'inactive',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_institutions_owner_id ON institutions(owner_id);
CREATE INDEX idx_sub_areas_institution_id ON sub_areas(institution_id);
CREATE INDEX idx_bed_assignments_sub_area_id ON bed_assignments(sub_area_id);
CREATE INDEX idx_institution_members_institution_id ON institution_members(institution_id);
CREATE INDEX idx_institution_members_user_id ON institution_members(user_id);
CREATE INDEX idx_institution_api_keys_institution_id ON institution_api_keys(institution_id);
CREATE INDEX idx_institution_rules_institution_id ON institution_rules(institution_id);
CREATE INDEX idx_api_usage_logs_institution_id ON api_usage_logs(institution_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_power_bi_exports_institution_id ON power_bi_exports(institution_id);
CREATE INDEX idx_epimed_integrations_institution_id ON epimed_integrations(institution_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_bi_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE epimed_integrations ENABLE ROW LEVEL SECURITY;

-- Policies para user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Policies para institutions
CREATE POLICY "Users can view institutions they belong to" ON institutions FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    id IN (SELECT institution_id FROM institution_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can update their institutions" ON institutions FOR UPDATE 
  USING (owner_id = auth.uid());

-- Policies para sub_areas
CREATE POLICY "Users can view sub_areas of their institutions" ON sub_areas FOR SELECT 
  USING (
    institution_id IN (
      SELECT id FROM institutions WHERE owner_id = auth.uid()
      UNION
      SELECT institution_id FROM institution_members WHERE user_id = auth.uid()
    )
  );

-- Policies para institution_api_keys
CREATE POLICY "Admins can view API keys" ON institution_api_keys FOR SELECT 
  USING (
    institution_id IN (
      SELECT id FROM institutions WHERE owner_id = auth.uid()
      UNION
      SELECT institution_id FROM institution_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- VIEWS PARA POWER BI
-- ============================================================================

CREATE OR REPLACE VIEW vw_institution_metrics AS
SELECT 
  i.id AS institution_id,
  i.name AS institution_name,
  COUNT(DISTINCT sa.id) AS total_sub_areas,
  COUNT(DISTINCT ba.id) AS total_beds,
  COUNT(DISTINCT im.user_id) AS total_members,
  COUNT(DISTINCT iak.id) AS total_api_keys,
  COUNT(DISTINCT ir.id) AS total_rules,
  SUM(aul.tokens_used) AS total_tokens_used,
  SUM(aul.cost_usd) AS total_cost_usd
FROM institutions i
LEFT JOIN sub_areas sa ON sa.institution_id = i.id
LEFT JOIN bed_assignments ba ON ba.sub_area_id = sa.id
LEFT JOIN institution_members im ON im.institution_id = i.id
LEFT JOIN institution_api_keys iak ON iak.institution_id = i.id
LEFT JOIN institution_rules ir ON ir.institution_id = i.id
LEFT JOIN api_usage_logs aul ON aul.institution_id = i.id
GROUP BY i.id, i.name;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para criar instituição padrão no primeiro login
CREATE OR REPLACE FUNCTION create_default_institution()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO institutions (name, description, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha') || ' - Instituição',
    'Instituição padrão',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar instituição automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_institution();

-- ============================================================================
-- INSERIR REGRAS PADRÃO (16 PRINCIPAIS)
-- ============================================================================

-- Esta função será chamada quando uma instituição for criada
CREATE OR REPLACE FUNCTION insert_default_rules(p_institution_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO institution_rules (institution_id, rule_number, title, description, is_default, is_active)
  VALUES
    (p_institution_id, 1, 'Identificação do Paciente', 'Nome completo, idade, sexo, data de internação', TRUE, TRUE),
    (p_institution_id, 2, 'Diagnóstico Principal', 'Diagnóstico que motivou a internação', TRUE, TRUE),
    (p_institution_id, 3, 'Comorbidades', 'Doenças pré-existentes relevantes', TRUE, TRUE),
    (p_institution_id, 4, 'Sinais Vitais', 'PA, FC, FR, Temp, SatO2', TRUE, TRUE),
    (p_institution_id, 5, 'Exame Físico', 'Principais achados do exame físico', TRUE, TRUE),
    (p_institution_id, 6, 'Exames Laboratoriais', 'Hemograma, função renal, eletrólitos, etc', TRUE, TRUE),
    (p_institution_id, 7, 'Exames de Imagem', 'RX, TC, RM, USG relevantes', TRUE, TRUE),
    (p_institution_id, 8, 'Medicações em Uso', 'Lista completa de medicamentos atuais', TRUE, TRUE),
    (p_institution_id, 9, 'Plano Terapêutico', 'Condutas e tratamentos propostos', TRUE, TRUE),
    (p_institution_id, 10, 'Evolução Clínica', 'Mudanças desde último round', TRUE, TRUE),
    (p_institution_id, 11, 'Pendências', 'Exames, pareceres ou procedimentos aguardando', TRUE, TRUE),
    (p_institution_id, 12, 'Interconsultas', 'Especialidades consultadas', TRUE, TRUE),
    (p_institution_id, 13, 'Suporte Ventilatório', 'Se em VM, parâmetros e modo', TRUE, TRUE),
    (p_institution_id, 14, 'Balanço Hídrico', 'Entrada, saída, balanço 24h', TRUE, TRUE),
    (p_institution_id, 15, 'Antibioticoterapia', 'ATB em uso, tempo de tratamento', TRUE, TRUE),
    (p_institution_id, 16, 'Prognóstico e Alta', 'Previsão de alta ou transferência', TRUE, TRUE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE institutions IS 'Instituições matriz (hospitais, clínicas)';
COMMENT ON TABLE sub_areas IS 'Subáreas dentro das instituições (UTIs, enfermarias)';
COMMENT ON TABLE bed_assignments IS 'Leitos mapeados em cada subárea';
COMMENT ON TABLE institution_api_keys IS 'Até 3 API keys simultâneas por instituição';
COMMENT ON TABLE institution_rules IS 'Até 40 regras personalizáveis por instituição';
COMMENT ON TABLE power_bi_exports IS 'Exportações para integração com Power BI';
COMMENT ON TABLE epimed_integrations IS 'Integrações com sistema EPIMED';

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
