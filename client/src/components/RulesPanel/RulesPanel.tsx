import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth';
import './RulesPanel.css';

interface Rule {
  id: string;
  rule_text: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface RulesPanelProps {
  onClose: () => void;
}

// Regras pré-formatadas que todo usuário recebe ao criar conta
const DEFAULT_RULES = [
  {
    rule_text: "Sempre iniciar o round com o nome completo do paciente, idade e leito",
    order_index: 1
  },
  {
    rule_text: "Incluir diagnóstico principal e diagnósticos secundários em ordem de relevância",
    order_index: 2
  },
  {
    rule_text: "Descrever quadro clínico atual de forma objetiva e concisa",
    order_index: 3
  },
  {
    rule_text: "Listar medicações em uso com doses e horários",
    order_index: 4
  },
  {
    rule_text: "Incluir resultados de exames laboratoriais relevantes com valores de referência",
    order_index: 5
  },
  {
    rule_text: "Descrever exames de imagem com achados principais",
    order_index: 6
  },
  {
    rule_text: "Apresentar sinais vitais (PA, FC, FR, Tax, SatO2)",
    order_index: 7
  },
  {
    rule_text: "Incluir balanço hídrico quando relevante",
    order_index: 8
  },
  {
    rule_text: "Descrever plano terapêutico de forma clara e sequencial",
    order_index: 9
  },
  {
    rule_text: "Mencionar pendências e condutas a serem tomadas",
    order_index: 10
  },
  {
    rule_text: "Incluir evolução clínica comparada ao dia anterior",
    order_index: 11
  },
  {
    rule_text: "Usar terminologia médica adequada e padronizada",
    order_index: 12
  },
  {
    rule_text: "Evitar abreviações não padronizadas",
    order_index: 13
  },
  {
    rule_text: "Manter formatação clara com parágrafos e tópicos quando apropriado",
    order_index: 14
  },
  {
    rule_text: "Incluir data e hora da evolução",
    order_index: 15
  },
  {
    rule_text: "Finalizar com assinatura digital do médico responsável",
    order_index: 16
  }
];

export const RulesPanel: React.FC<RulesPanelProps> = ({ onClose }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newRuleText, setNewRuleText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const session = await authService.getCurrentSession();
      
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('round_rules')
        .select('*')
        .eq('user_id', session.user.id)
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Se não tem regras, criar as regras padrão
      if (!data || data.length === 0) {
        await createDefaultRules(session.user.id);
        await loadRules(); // Recarregar após criar
        return;
      }

      setRules(data);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
      alert('Erro ao carregar regras');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRules = async (userId: string) => {
    try {
      const rulesToInsert = DEFAULT_RULES.map(rule => ({
        user_id: userId,
        rule_text: rule.rule_text,
        is_active: true,
        order_index: rule.order_index
      }));

      const { error } = await supabase
        .from('round_rules')
        .insert(rulesToInsert);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar regras padrão:', error);
    }
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('round_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: !currentStatus } : rule
      ));
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
      alert('Erro ao atualizar regra');
    }
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditText(rule.rule_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (ruleId: string) => {
    try {
      if (!editText.trim()) {
        alert('O texto da regra não pode estar vazio');
        return;
      }

      const { error } = await supabase
        .from('round_rules')
        .update({ rule_text: editText })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.map(rule => 
        rule.id === ruleId ? { ...rule, rule_text: editText } : rule
      ));

      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      alert('Erro ao salvar regra');
    }
  };

  const addNewRule = async () => {
    try {
      if (!newRuleText.trim()) {
        alert('Digite o texto da nova regra');
        return;
      }

      // Verificar limite de 40 regras
      if (rules.length >= 40) {
        alert('Limite de 40 regras atingido! Para adicionar mais, entre em contato com o suporte.');
        return;
      }

      const session = await authService.getCurrentSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      const maxOrder = Math.max(...rules.map(r => r.order_index), 0);

      const { data, error } = await supabase
        .from('round_rules')
        .insert({
          user_id: session.user.id,
          rule_text: newRuleText,
          is_active: true,
          order_index: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

      setRules([...rules, data]);
      setNewRuleText('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Erro ao adicionar regra:', error);
      alert('Erro ao adicionar regra');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('round_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.filter(rule => rule.id !== ruleId));
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      alert('Erro ao excluir regra');
    }
  };

  const moveRule = async (ruleId: string, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex(r => r.id === ruleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const newRules = [...rules];
    [newRules[currentIndex], newRules[newIndex]] = [newRules[newIndex], newRules[currentIndex]];

    // Atualizar order_index
    const updates = newRules.map((rule, index) => ({
      id: rule.id,
      order_index: index + 1
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('round_rules')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      setRules(newRules);
    } catch (error) {
      console.error('Erro ao reordenar regras:', error);
      alert('Erro ao reordenar regras');
    }
  };

  const activeRulesCount = rules.filter(r => r.is_active).length;

  return (
    <div className="rules-panel-overlay">
      <div className="rules-panel-modal">
        <button className="rules-panel-close" onClick={onClose}>×</button>

        <div className="rules-panel-header">
          <h2>📝 Regras de Geração de Rounds</h2>
          <p className="rules-panel-subtitle">
            Personalize como seus rounds médicos são gerados pela IA
          </p>
          <div className="rules-panel-stats">
            <span className="rules-stat">
              <strong>{rules.length}</strong> regras cadastradas
            </span>
            <span className="rules-stat">
              <strong>{activeRulesCount}</strong> ativas
            </span>
            <span className="rules-stat" style={{ color: rules.length >= 40 ? '#c33' : '#666' }}>
              <strong>{40 - rules.length}</strong> restantes (limite: 40)
            </span>
          </div>
        </div>

        <div className="rules-panel-content">
          {loading ? (
            <div className="rules-loading">Carregando regras...</div>
          ) : (
            <>
              <div className="rules-list">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className={`rule-item ${rule.is_active ? 'active' : 'inactive'}`}
                  >
                    <div className="rule-order">
                      <span className="rule-number">{index + 1}</span>
                      <div className="rule-move-buttons">
                        <button
                          onClick={() => moveRule(rule.id, 'up')}
                          disabled={index === 0}
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveRule(rule.id, 'down')}
                          disabled={index === rules.length - 1}
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    <div className="rule-content">
                      {editingId === rule.id ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="rule-edit-textarea"
                          rows={3}
                        />
                      ) : (
                        <p className="rule-text">{rule.rule_text}</p>
                      )}
                    </div>

                    <div className="rule-actions">
                      <label className="rule-toggle">
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={() => toggleRule(rule.id, rule.is_active)}
                        />
                        <span className="toggle-slider"></span>
                      </label>

                      {editingId === rule.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(rule.id)}
                            className="rule-btn rule-btn-save"
                          >
                            ✓ Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rule-btn rule-btn-cancel"
                          >
                            ✕ Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(rule)}
                            className="rule-btn rule-btn-edit"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="rule-btn rule-btn-delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rules-add-section">
                {showAddForm ? (
                  <div className="rules-add-form">
                    <textarea
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      placeholder="Digite a nova regra..."
                      className="rule-add-textarea"
                      rows={3}
                    />
                    <div className="rules-add-buttons">
                      <button onClick={addNewRule} className="btn-add-rule">
                        ✓ Adicionar Regra
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewRuleText('');
                        }}
                        className="btn-cancel-add"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn-show-add-form"
                  >
                    ➕ Adicionar Nova Regra
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="rules-panel-footer">
          <p className="rules-help-text">
            💡 <strong>Dica:</strong> As regras ativas serão usadas pela IA para gerar seus rounds.
            Você pode reordenar, editar, ativar/desativar ou excluir regras a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RulesPanel;
