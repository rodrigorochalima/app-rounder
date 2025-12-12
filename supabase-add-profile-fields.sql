-- =====================================================
-- ADICIONAR CAMPOS NO PERFIL DO USUÁRIO
-- =====================================================
-- Adiciona campos necessários para rodapé automático
-- e templates de impressão
-- =====================================================

-- Adicionar colunas na tabela user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS hospital_name TEXT,
ADD COLUMN IF NOT EXISTS hospital_phone TEXT,
ADD COLUMN IF NOT EXISTS position TEXT, -- Cargo principal
ADD COLUMN IF NOT EXISTS positions TEXT[], -- Múltiplos cargos
ADD COLUMN IF NOT EXISTS personal_phone TEXT, -- Telefone pessoal
ADD COLUMN IF NOT EXISTS institution_logo_url TEXT; -- Logo do hospital

-- Comentários nas colunas
COMMENT ON COLUMN public.user_profiles.hospital_name IS 'Nome do hospital/instituição onde trabalha';
COMMENT ON COLUMN public.user_profiles.hospital_phone IS 'Telefone do hospital/instituição';
COMMENT ON COLUMN public.user_profiles.position IS 'Cargo principal (ex: Médico Residente, Preceptor)';
COMMENT ON COLUMN public.user_profiles.positions IS 'Array de cargos/funções adicionais';
COMMENT ON COLUMN public.user_profiles.personal_phone IS 'Telefone pessoal do médico';
COMMENT ON COLUMN public.user_profiles.institution_logo_url IS 'URL do logo do hospital (Supabase Storage)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_hospital_name 
  ON public.user_profiles(hospital_name);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Campos adicionados com sucesso!';
  RAISE NOTICE '📋 Novos campos:';
  RAISE NOTICE '   - hospital_name (nome do hospital)';
  RAISE NOTICE '   - hospital_phone (telefone do hospital)';
  RAISE NOTICE '   - position (cargo principal)';
  RAISE NOTICE '   - positions (múltiplos cargos)';
  RAISE NOTICE '   - personal_phone (telefone pessoal)';
  RAISE NOTICE '   - institution_logo_url (logo do hospital)';
  RAISE NOTICE '🔄 Próximo passo: Executar este SQL no Supabase SQL Editor';
END $$;
