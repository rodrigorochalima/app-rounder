-- ============================================================
-- SCHEMA COMPLETO - App Rounder (Neon PostgreSQL)
-- Substitui todas as tabelas do Supabase
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: users (substitui auth.users do Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: user_profiles (dados do médico)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  specialty TEXT,
  crm TEXT,
  crm_state TEXT,
  avatar_url TEXT,
  hospital_name TEXT,
  hospital_phone TEXT,
  position TEXT,
  personal_phone TEXT,
  role TEXT DEFAULT 'rotineiro',
  onboarding_completed BOOLEAN DEFAULT false,
  api_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABELA: user_api_keys (chaves de API por usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  monthly_limit INTEGER DEFAULT 1000,
  current_month_usage INTEGER DEFAULT 0,
  cost_per_million_tokens DECIMAL(10,4) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: user_api_usage_logs (logs de uso das APIs)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES user_api_keys(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  tokens_used INTEGER,
  request_type TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: round_rules (regras de geração de rounds)
-- ============================================================
CREATE TABLE IF NOT EXISTS round_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT round_rules_rule_text_not_empty CHECK (length(trim(rule_text)) > 0),
  CONSTRAINT round_rules_order_index_positive CHECK (order_index > 0)
);

-- ============================================================
-- TABELA: refresh_tokens (sessões JWT)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_api_usage_logs_user_id ON user_api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_round_rules_user_id ON round_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_round_rules_order ON round_rules(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_users_updated_at') THEN
    CREATE TRIGGER trigger_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_user_profiles_updated_at') THEN
    CREATE TRIGGER trigger_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_user_api_keys_updated_at') THEN
    CREATE TRIGGER trigger_user_api_keys_updated_at
      BEFORE UPDATE ON user_api_keys
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_round_rules_updated_at') THEN
    CREATE TRIGGER trigger_round_rules_updated_at
      BEFORE UPDATE ON round_rules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- REGRAS PADRÃO (inseridas para novos usuários via função)
-- ============================================================
-- As regras padrão são inseridas via código no signup
