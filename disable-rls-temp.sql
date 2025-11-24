-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para testes
-- ⚠️ ATENÇÃO: Isso remove a segurança! Use apenas para testes!

-- Desabilitar RLS na tabela user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Verificar se funcionou
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';
