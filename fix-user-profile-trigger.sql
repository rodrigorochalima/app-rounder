-- Corrigir trigger de criação de user_profile
-- Este SQL deve ser executado no Supabase

-- 1. Criar função para inserir user_profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email, crm, crm_state, specialty, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'crm', ''),
    COALESCE(NEW.raw_user_meta_data->>'crm_state', ''),
    COALESCE(NEW.raw_user_meta_data->>'specialty', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'rotineiro'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Criar novo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Atualizar função de criar instituição padrão
CREATE OR REPLACE FUNCTION public.create_default_institution_for_user(user_id_param UUID)
RETURNS UUID AS $$
DECLARE
  institution_id_var UUID;
  user_name TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO user_name FROM public.user_profiles WHERE user_id = user_id_param;
  
  -- Criar instituição
  INSERT INTO public.institutions (name, description, owner_id)
  VALUES (
    COALESCE(user_name, 'Minha') || ' - Instituição',
    'Instituição padrão',
    user_id_param
  )
  RETURNING id INTO institution_id_var;
  
  -- Adicionar usuário como membro owner
  INSERT INTO public.institution_members (institution_id, user_id, role)
  VALUES (institution_id_var, user_id_param, 'owner');
  
  -- Inserir 16 regras padrão
  PERFORM insert_default_rules(institution_id_var);
  
  RETURN institution_id_var;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIM
