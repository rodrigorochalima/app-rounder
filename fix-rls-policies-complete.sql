-- ============================================================================
-- CORREÇÃO DE RLS POLICIES PARA USER_PROFILES
-- Nexo Soluções Digitais - App Rounder
-- ============================================================================

-- 1. Dropar policies existentes (evitar erro de duplicação)
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;

-- 2. Habilitar RLS na tabela user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy para INSERT - Permite criar apenas seu próprio perfil
CREATE POLICY "Users can create their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Policy para SELECT - Permite ver apenas seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Policy para UPDATE - Permite atualizar apenas seu próprio perfil
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Policy para DELETE - Permite deletar apenas seu próprio perfil
CREATE POLICY "Users can delete their own profile"
ON user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- FIM - Policies criadas com sucesso!
-- ============================================================================
