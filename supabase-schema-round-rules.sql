-- =====================================================
-- SCHEMA: Sistema de Regras de Geração de Rounds
-- =====================================================
-- Tabela para armazenar regras personalizadas de cada usuário
-- Cada usuário pode ter suas próprias regras ativas/inativas
-- =====================================================

-- 1. Criar tabela round_rules
CREATE TABLE IF NOT EXISTS public.round_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT round_rules_rule_text_not_empty CHECK (length(trim(rule_text)) > 0),
  CONSTRAINT round_rules_order_index_positive CHECK (order_index > 0)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_round_rules_user_id ON public.round_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_round_rules_is_active ON public.round_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_round_rules_order_index ON public.round_rules(order_index);
CREATE INDEX IF NOT EXISTS idx_round_rules_user_active ON public.round_rules(user_id, is_active);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.round_rules ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de segurança (RLS)

-- Política: Usuário pode ver apenas suas próprias regras
CREATE POLICY "Usuários podem ver suas próprias regras"
  ON public.round_rules
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuário pode inserir suas próprias regras
CREATE POLICY "Usuários podem criar suas próprias regras"
  ON public.round_rules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuário pode atualizar apenas suas próprias regras
CREATE POLICY "Usuários podem atualizar suas próprias regras"
  ON public.round_rules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuário pode deletar apenas suas próprias regras
CREATE POLICY "Usuários podem deletar suas próprias regras"
  ON public.round_rules
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_round_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_round_rules_updated_at
  BEFORE UPDATE ON public.round_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_round_rules_updated_at();

-- 6. Função para reordenar regras após deletar
CREATE OR REPLACE FUNCTION public.reorder_round_rules_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Reordenar as regras do usuário após deletar uma
  UPDATE public.round_rules
  SET order_index = order_index - 1
  WHERE user_id = OLD.user_id 
    AND order_index > OLD.order_index;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reorder_round_rules_after_delete
  AFTER DELETE ON public.round_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.reorder_round_rules_after_delete();

-- 7. Comentários para documentação
COMMENT ON TABLE public.round_rules IS 'Regras personalizadas de geração de rounds médicos por usuário';
COMMENT ON COLUMN public.round_rules.id IS 'ID único da regra';
COMMENT ON COLUMN public.round_rules.user_id IS 'ID do usuário dono da regra';
COMMENT ON COLUMN public.round_rules.rule_text IS 'Texto descritivo da regra';
COMMENT ON COLUMN public.round_rules.is_active IS 'Se a regra está ativa ou não';
COMMENT ON COLUMN public.round_rules.order_index IS 'Ordem de exibição da regra (1, 2, 3...)';
COMMENT ON COLUMN public.round_rules.created_at IS 'Data de criação da regra';
COMMENT ON COLUMN public.round_rules.updated_at IS 'Data da última atualização';

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

-- VERIFICAÇÃO
DO $$
BEGIN
  RAISE NOTICE '✅ Schema round_rules criado com sucesso!';
  RAISE NOTICE '📋 Tabela: round_rules';
  RAISE NOTICE '🔒 RLS ativado: cada usuário vê apenas suas próprias regras';
  RAISE NOTICE '⚡ Triggers: update_updated_at, reorder_after_delete';
  RAISE NOTICE '📊 Próximo passo: Executar este SQL no Supabase SQL Editor';
END $$;
