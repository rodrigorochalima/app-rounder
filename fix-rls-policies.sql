-- Corrigir Row Level Security (RLS) para permitir signup
-- Execute este SQL no Supabase SQL Editor

-- 1. Habilitar RLS na tabela user_profiles (se não estiver habilitado)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policy para permitir que usuários autenticados criem seu próprio perfil
CREATE POLICY "Users can create their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Policy para permitir que usuários vejam seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Policy para permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Policy para permitir que usuários deletem seu próprio perfil
CREATE POLICY "Users can delete their own profile"
ON user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- FIM
