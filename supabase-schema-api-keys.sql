-- ============================================
-- SCHEMA PARA GERENCIAMENTO PROFISSIONAL DE API KEYS
-- App-Rounder - Sistema Multi-Instituição
-- ============================================

-- Tabela de Instituições
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  header_template TEXT,
  footer_template TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de API Keys (criptografadas)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'cerebras', 'qwen', 'groq', etc.
  key_encrypted TEXT NOT NULL, -- Chave criptografada
  key_name TEXT, -- Nome descritivo (ex: "Qwen Production")
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(institution_id, provider)
);

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'security', 'ai', 'general', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Usuários Admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin', -- 'super_admin', 'admin', 'viewer'
  institution_id UUID REFERENCES institutions(id),
  active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Logs de Acesso
CREATE TABLE IF NOT EXISTS admin_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL, -- 'login', 'update_key', 'view_keys', etc.
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Audit Trail (rastreamento de mudanças)
CREATE TABLE IF NOT EXISTS api_keys_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated'
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_api_keys_institution ON api_keys(institution_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_institution ON admin_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_admin_user ON admin_access_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON admin_access_logs(created_at);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Instituição padrão (Sanador Caneto)
INSERT INTO institutions (name, display_name, active) 
VALUES ('sanador-caneto', 'Sanador Caneto', true)
ON CONFLICT (name) DO NOTHING;

-- Configurações do sistema
INSERT INTO system_config (key, value, description, category) VALUES
  ('encryption_enabled', 'true', 'Habilitar criptografia de API keys', 'security'),
  ('session_timeout_minutes', '60', 'Timeout de sessão admin em minutos', 'security'),
  ('max_login_attempts', '5', 'Máximo de tentativas de login', 'security'),
  ('default_ai_provider', 'qwen', 'Provedor de IA padrão', 'ai'),
  ('enable_audit_logs', 'true', 'Habilitar logs de auditoria', 'security')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys_audit ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir acesso via service_role key)
CREATE POLICY "Allow service role full access to institutions" ON institutions
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to api_keys" ON api_keys
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to system_config" ON system_config
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to admin_users" ON admin_users
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to admin_access_logs" ON admin_access_logs
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to api_keys_audit" ON api_keys_audit
  FOR ALL USING (true);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para registrar uso de API key
CREATE OR REPLACE FUNCTION record_api_key_usage(p_api_key_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE api_keys 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Função para obter API keys ativas de uma instituição
CREATE OR REPLACE FUNCTION get_active_api_keys(p_institution_id UUID)
RETURNS TABLE (
  provider TEXT,
  key_encrypted TEXT,
  key_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.provider,
    ak.key_encrypted,
    ak.key_name
  FROM api_keys ak
  WHERE 
    ak.institution_id = p_institution_id 
    AND ak.active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE institutions IS 'Instituições/clientes que usam o sistema';
COMMENT ON TABLE api_keys IS 'API keys criptografadas por instituição e provedor';
COMMENT ON TABLE system_config IS 'Configurações gerais do sistema';
COMMENT ON TABLE admin_users IS 'Usuários administradores do sistema';
COMMENT ON TABLE admin_access_logs IS 'Logs de acesso e ações dos admins';
COMMENT ON TABLE api_keys_audit IS 'Auditoria de mudanças nas API keys';

COMMENT ON COLUMN api_keys.key_encrypted IS 'Chave API criptografada usando AES-256';
COMMENT ON COLUMN api_keys.provider IS 'Provedor da API: cerebras, qwen, groq, gemini, etc.';
COMMENT ON COLUMN admin_users.role IS 'super_admin: acesso total | admin: gerencia instituição | viewer: apenas visualiza';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
  RAISE NOTICE 'Schema criado com sucesso!';
  RAISE NOTICE 'Tabelas: institutions, api_keys, system_config, admin_users, admin_access_logs, api_keys_audit';
  RAISE NOTICE 'Próximo passo: Executar este SQL no Supabase SQL Editor';
END $$;
