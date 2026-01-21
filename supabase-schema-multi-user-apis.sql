-- ============================================
-- SCHEMA MULTI-USUÁRIO PARA GESTÃO DE APIs
-- App Rounder - Sistema de Gestão Individual de API Keys
-- ============================================

-- ============================================
-- TABELA: user_api_keys
-- Cada usuário gerencia suas próprias API keys
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações da API
  provider TEXT NOT NULL, -- 'qwen', 'gemini', 'openai', 'groq', 'cerebras', 'cohere', 'mistral', 'deepseek'
  api_key_encrypted TEXT NOT NULL, -- Chave criptografada
  encryption_iv TEXT NOT NULL, -- Vetor de inicialização para criptografia
  
  -- Metadados
  name TEXT, -- Nome descritivo (ex: "Gemini Produção", "OpenAI Backup")
  is_active BOOLEAN DEFAULT true, -- Usuário pode ativar/desativar
  is_default BOOLEAN DEFAULT false, -- API padrão para este provider
  
  -- Controle de uso
  usage_count INTEGER DEFAULT 0, -- Quantas vezes foi usada
  tokens_used BIGINT DEFAULT 0, -- Total de tokens consumidos (estimativa)
  last_used_at TIMESTAMP WITH TIME ZONE, -- Última vez que foi usada
  
  -- Limites (opcional - usuário pode definir)
  monthly_limit INTEGER, -- Limite mensal de requisições
  monthly_token_limit BIGINT, -- Limite mensal de tokens
  cost_per_million_tokens DECIMAL(10,2), -- Custo por milhão de tokens (para tracking)
  
  -- Notas
  notes TEXT, -- Notas do usuário sobre esta API
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_api_keys_provider_check CHECK (
    provider IN ('qwen', 'gemini', 'openai', 'groq', 'cerebras', 'cohere', 'mistral', 'deepseek')
  )
);

-- ============================================
-- TABELA: user_api_usage_logs
-- Log detalhado de uso de cada API
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES user_api_keys(id) ON DELETE CASCADE,
  
  -- Detalhes do uso
  provider TEXT NOT NULL,
  tokens_used INTEGER, -- Tokens usados nesta requisição
  request_type TEXT, -- 'generate_round', 'transcribe', etc.
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}', -- { model: 'gpt-4', temperature: 0.7, etc }
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: user_profiles (extensão)
-- Adicionar campo para configurações de APIs
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_config JSONB DEFAULT '{}';

COMMENT ON COLUMN user_profiles.api_config IS 'Configurações de APIs: { selectedAPIs: [], apiKeys: {}, preferences: {} }';

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_default ON user_api_keys(is_default);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider ON user_api_keys(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_api_usage_logs_user_id ON user_api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_usage_logs_api_key_id ON user_api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_user_api_usage_logs_created_at ON user_api_usage_logs(created_at DESC);

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

CREATE TRIGGER update_user_api_keys_updated_at 
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuário só vê suas próprias API keys
CREATE POLICY "Usuários veem apenas suas próprias API keys"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários inserem apenas suas próprias API keys"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam apenas suas próprias API keys"
  ON user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam apenas suas próprias API keys"
  ON user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas: Usuário só vê seus próprios logs
CREATE POLICY "Usuários veem apenas seus próprios logs"
  ON user_api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários inserem apenas seus próprios logs"
  ON user_api_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função: Incrementar uso de API key
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  p_api_key_id UUID,
  p_tokens_used INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE user_api_keys 
  SET 
    usage_count = usage_count + 1,
    tokens_used = tokens_used + COALESCE(p_tokens_used, 0),
    last_used_at = NOW()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Obter API key ativa padrão para um provider
CREATE OR REPLACE FUNCTION get_default_api_key(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS TABLE (
  id UUID,
  api_key_encrypted TEXT,
  encryption_iv TEXT,
  name TEXT
) AS $$
BEGIN
  -- Tentar pegar a API key padrão ativa
  RETURN QUERY
  SELECT 
    uak.id,
    uak.api_key_encrypted,
    uak.encryption_iv,
    uak.name
  FROM user_api_keys uak
  WHERE 
    uak.user_id = p_user_id 
    AND uak.provider = p_provider
    AND uak.is_active = true
    AND uak.is_default = true
  LIMIT 1;
  
  -- Se não encontrou, pegar a primeira ativa
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      uak.id,
      uak.api_key_encrypted,
      uak.encryption_iv,
      uak.name
    FROM user_api_keys uak
    WHERE 
      uak.user_id = p_user_id 
      AND uak.provider = p_provider
      AND uak.is_active = true
    ORDER BY uak.created_at ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Rotacionar para próxima API key ativa
CREATE OR REPLACE FUNCTION get_next_active_api_key(
  p_user_id UUID,
  p_provider TEXT,
  p_current_key_id UUID
)
RETURNS TABLE (
  id UUID,
  api_key_encrypted TEXT,
  encryption_iv TEXT,
  name TEXT
) AS $$
BEGIN
  -- Pegar próxima API key ativa (circular)
  RETURN QUERY
  SELECT 
    uak.id,
    uak.api_key_encrypted,
    uak.encryption_iv,
    uak.name
  FROM user_api_keys uak
  WHERE 
    uak.user_id = p_user_id 
    AND uak.provider = p_provider
    AND uak.is_active = true
    AND uak.id != p_current_key_id
  ORDER BY uak.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Obter estatísticas de uso do usuário
CREATE OR REPLACE FUNCTION get_user_api_stats(p_user_id UUID)
RETURNS TABLE (
  provider TEXT,
  total_keys INTEGER,
  active_keys INTEGER,
  total_usage INTEGER,
  total_tokens BIGINT,
  last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uak.provider,
    COUNT(*)::INTEGER as total_keys,
    COUNT(*) FILTER (WHERE uak.is_active = true)::INTEGER as active_keys,
    SUM(uak.usage_count)::INTEGER as total_usage,
    SUM(uak.tokens_used)::BIGINT as total_tokens,
    MAX(uak.last_used_at) as last_used
  FROM user_api_keys uak
  WHERE uak.user_id = p_user_id
  GROUP BY uak.provider
  ORDER BY total_usage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Resetar contadores mensais (executar via cron)
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Resetar apenas se estiver no dia 1 do mês
  IF EXTRACT(DAY FROM NOW()) = 1 THEN
    UPDATE user_api_keys
    SET 
      usage_count = 0,
      tokens_used = 0
    WHERE 
      monthly_limit IS NOT NULL 
      OR monthly_token_limit IS NOT NULL;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: API keys do usuário com estatísticas
CREATE OR REPLACE VIEW user_api_keys_with_stats AS
SELECT 
  uak.*,
  CASE 
    WHEN uak.monthly_limit IS NOT NULL 
    THEN ROUND((uak.usage_count::DECIMAL / uak.monthly_limit) * 100, 2)
    ELSE NULL
  END as usage_percentage,
  CASE 
    WHEN uak.monthly_token_limit IS NOT NULL 
    THEN ROUND((uak.tokens_used::DECIMAL / uak.monthly_token_limit) * 100, 2)
    ELSE NULL
  END as token_usage_percentage
FROM user_api_keys uak;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE user_api_keys IS 'API keys individuais de cada usuário com gestão de uso e limites';
COMMENT ON TABLE user_api_usage_logs IS 'Log detalhado de cada uso de API por usuário';

COMMENT ON COLUMN user_api_keys.api_key_encrypted IS 'Chave API criptografada usando AES-256-GCM';
COMMENT ON COLUMN user_api_keys.is_active IS 'Usuário pode desativar temporariamente uma API para economizar créditos';
COMMENT ON COLUMN user_api_keys.is_default IS 'API padrão para este provider (apenas uma pode ser default)';
COMMENT ON COLUMN user_api_keys.monthly_limit IS 'Limite mensal de requisições definido pelo usuário';
COMMENT ON COLUMN user_api_keys.tokens_used IS 'Total de tokens consumidos (estimativa)';

-- ============================================
-- EXEMPLO DE USO
-- ============================================

/*
-- 1. Usuário adiciona uma API key:
INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, encryption_iv, name, is_default)
VALUES (
  auth.uid(),
  'gemini',
  'encrypted_key_here',
  'iv_here',
  'Gemini Produção',
  true
);

-- 2. Obter API key padrão do usuário:
SELECT * FROM get_default_api_key(auth.uid(), 'gemini');

-- 3. Registrar uso:
SELECT increment_api_key_usage('api_key_id_here', 1500);

-- 4. Ver estatísticas:
SELECT * FROM get_user_api_stats(auth.uid());

-- 5. Rotacionar para próxima API:
SELECT * FROM get_next_active_api_key(auth.uid(), 'gemini', 'current_key_id');
*/

-- ============================================
-- VERIFICAÇÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schema multi-usuário criado com sucesso!';
  RAISE NOTICE '📊 Tabelas: user_api_keys, user_api_usage_logs';
  RAISE NOTICE '🔒 RLS ativado: cada usuário vê apenas suas próprias APIs';
  RAISE NOTICE '🔄 Funções: increment_usage, get_default, get_next, stats';
  RAISE NOTICE '📝 Próximo passo: Executar este SQL no Supabase SQL Editor';
END $$;
