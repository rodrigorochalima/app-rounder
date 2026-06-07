/**
 * ClinicalContextPanel — Painel de Contexto Clínico RAG
 * 
 * Permite registrar e acompanhar pacientes por leito entre rounds.
 * Funciona como memória persistente: alta, óbito, evolução, pendências.
 * Esse contexto é injetado automaticamente no prompt da LLM ao gerar o round.
 */
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, BedDouble, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Patient {
  id?: number;
  bed_number: string;
  patient_name?: string;
  main_diagnosis?: string;
  admission_date?: string;
  current_status: 'active' | 'discharged' | 'deceased' | 'transferred';
  pending_exams?: string;
  active_antibiotics?: string;
  relevant_notes?: string;
  last_updated?: string;
}

interface PendingItem {
  id?: number;
  bed_number: string;
  item_type: 'exam' | 'procedure' | 'medication' | 'evaluation' | 'other';
  description: string;
  requested_date?: string;
  resolved: boolean;
  resolved_date?: string;
}

interface ClinicalContextPanelProps {
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active: { label: 'Internado', color: '#2E7D32', bg: '#E8F5E9', icon: '🏥' },
  discharged: { label: 'Alta', color: '#1565C0', bg: '#E3F2FD', icon: '🏠' },
  deceased: { label: 'Óbito', color: '#B71C1C', bg: '#FFEBEE', icon: '🕊️' },
  transferred: { label: 'Transferido', color: '#E65100', bg: '#FFF3E0', icon: '🚑' }
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  exam: '🔬 Exame',
  procedure: '🩺 Procedimento',
  medication: '💊 Medicação',
  evaluation: '👨‍⚕️ Avaliação',
  other: '📋 Outro'
};

export default function ClinicalContextPanel({ onClose }: ClinicalContextPanelProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'pending'>('patients');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddPending, setShowAddPending] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Formulário de novo paciente
  const [newPatient, setNewPatient] = useState<Patient>({
    bed_number: '',
    patient_name: '',
    main_diagnosis: '',
    admission_date: new Date().toISOString().split('T')[0],
    current_status: 'active',
    pending_exams: '',
    active_antibiotics: '',
    relevant_notes: ''
  });

  // Formulário de nova pendência
  const [newPending, setNewPending] = useState<PendingItem>({
    bed_number: '',
    item_type: 'exam',
    description: '',
    requested_date: new Date().toISOString().split('T')[0],
    resolved: false
  });

  const token = () => localStorage.getItem('access_token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientsRes, pendingRes] = await Promise.all([
        fetch('/api/clinical/patients', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/clinical/pending', { headers: { Authorization: `Bearer ${token()}` } })
      ]);
      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (pendingRes.ok) setPendingItems(await pendingRes.json());
    } catch (e) {
      console.error('Erro ao carregar dados clínicos:', e);
    } finally {
      setLoading(false);
    }
  };

  const savePatient = async () => {
    if (!newPatient.bed_number) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clinical/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newPatient)
      });
      if (res.ok) {
        await loadData();
        setShowAddPatient(false);
        setNewPatient({
          bed_number: '', patient_name: '', main_diagnosis: '',
          admission_date: new Date().toISOString().split('T')[0],
          current_status: 'active', pending_exams: '', active_antibiotics: '', relevant_notes: ''
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const updatePatientStatus = async (id: number, status: Patient['current_status']) => {
    try {
      await fetch(`/api/clinical/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ current_status: status })
      });
      await loadData();
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    }
  };

  const deletePatient = async (id: number) => {
    if (!confirm('Remover este paciente do contexto?')) return;
    try {
      await fetch(`/api/clinical/patients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      await loadData();
    } catch (e) {
      console.error('Erro ao remover paciente:', e);
    }
  };

  const savePending = async () => {
    if (!newPending.bed_number || !newPending.description) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clinical/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newPending)
      });
      if (res.ok) {
        await loadData();
        setShowAddPending(false);
        setNewPending({ bed_number: '', item_type: 'exam', description: '', requested_date: new Date().toISOString().split('T')[0], resolved: false });
      }
    } finally {
      setSaving(false);
    }
  };

  const resolvePending = async (id: number) => {
    try {
      await fetch(`/api/clinical/pending/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ resolved: true, resolved_date: new Date().toISOString().split('T')[0] })
      });
      await loadData();
    } catch (e) {
      console.error('Erro ao resolver pendência:', e);
    }
  };

  const activePatients = patients.filter(p => p.current_status === 'active');
  const inactivePatients = patients.filter(p => p.current_status !== 'active');
  const openPending = pendingItems.filter(p => !p.resolved);
  const resolvedPending = pendingItems.filter(p => p.resolved);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '16px', overflowY: 'auto'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '700px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '20px'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6C3483 0%, #9B59B6 100%)',
          borderRadius: '16px 16px 0 0', padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: '700' }}>
              🧠 Contexto Clínico dos Pacientes
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              Memória entre rounds • {activePatients.length} internados • {openPending.length} pendências
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={loadData}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'white' }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'white' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Info RAG */}
        <div style={{
          background: '#F3E5F5', padding: '10px 20px',
          borderBottom: '1px solid #E1BEE7',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>💡</span>
          <span style={{ fontSize: '12px', color: '#6C3483' }}>
            Esses dados são injetados automaticamente no prompt ao gerar o round, evitando alucinações e garantindo continuidade clínica.
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #F0F0F0' }}>
          {[
            { key: 'patients', label: `🏥 Pacientes (${patients.length})` },
            { key: 'pending', label: `⏳ Pendências (${openPending.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1, padding: '14px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                background: activeTab === tab.key ? 'white' : '#FAFAFA',
                color: activeTab === tab.key ? '#6C3483' : '#888',
                borderBottom: activeTab === tab.key ? '2px solid #9B59B6' : '2px solid transparent',
                marginBottom: '-2px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '12px' }}>Carregando dados clínicos...</p>
            </div>
          ) : activeTab === 'patients' ? (
            <>
              {/* Botão adicionar */}
              <button
                onClick={() => setShowAddPatient(!showAddPatient)}
                style={{
                  width: '100%', padding: '10px', marginBottom: '16px',
                  background: showAddPatient ? '#F5F5F5' : 'linear-gradient(135deg, #6C3483, #9B59B6)',
                  color: showAddPatient ? '#666' : 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Plus size={16} /> {showAddPatient ? 'Cancelar' : 'Adicionar Paciente'}
              </button>

              {/* Formulário de adição */}
              {showAddPatient && (
                <div style={{
                  background: '#F9F0FF', border: '1px solid #CE93D8', borderRadius: '10px',
                  padding: '16px', marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C3483', display: 'block', marginBottom: '4px' }}>
                        Leito *
                      </label>
                      <input
                        value={newPatient.bed_number}
                        onChange={e => setNewPatient({ ...newPatient, bed_number: e.target.value })}
                        placeholder="Ex: 01, UTI-3"
                        style={{ width: '100%', padding: '8px', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C3483', display: 'block', marginBottom: '4px' }}>
                        Nome do Paciente
                      </label>
                      <input
                        value={newPatient.patient_name}
                        onChange={e => setNewPatient({ ...newPatient, patient_name: e.target.value })}
                        placeholder="Opcional"
                        style={{ width: '100%', padding: '8px', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C3483', display: 'block', marginBottom: '4px' }}>
                      Diagnóstico Principal
                    </label>
                    <input
                      value={newPatient.main_diagnosis}
                      onChange={e => setNewPatient({ ...newPatient, main_diagnosis: e.target.value })}
                      placeholder="Ex: Sepse por foco pulmonar"
                      style={{ width: '100%', padding: '8px', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C3483', display: 'block', marginBottom: '4px' }}>
                        ATB Ativo
                      </label>
                      <input
                        value={newPatient.active_antibiotics}
                        onChange={e => setNewPatient({ ...newPatient, active_antibiotics: e.target.value })}
                        placeholder="Ex: Meropenem D3"
                        style={{ width: '100%', padding: '8px', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C3483', display: 'block', marginBottom: '4px' }}>
                        Exames Pendentes
                      </label>
                      <input
                        value={newPatient.pending_exams}
                        onChange={e => setNewPatient({ ...newPatient, pending_exams: e.target.value })}
                        placeholder="Ex: TC tórax, Hemocultura"
                        style={{ width: '100%', padding: '8px', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C3483', display: 'block', marginBottom: '4px' }}>
                      Notas Relevantes
                    </label>
                    <textarea
                      value={newPatient.relevant_notes}
                      onChange={e => setNewPatient({ ...newPatient, relevant_notes: e.target.value })}
                      placeholder="Outras informações importantes para o contexto do round..."
                      rows={2}
                      style={{ width: '100%', padding: '8px', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    onClick={savePatient}
                    disabled={saving || !newPatient.bed_number}
                    style={{
                      width: '100%', padding: '10px', background: '#6C3483', color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                    }}
                  >
                    {saving ? 'Salvando...' : '✅ Salvar Paciente'}
                  </button>
                </div>
              )}

              {/* Lista de pacientes ativos */}
              {activePatients.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2E7D32', fontSize: '13px', fontWeight: '700' }}>
                    🏥 INTERNADOS ({activePatients.length})
                  </h4>
                  {activePatients.map(p => (
                    <div key={p.id} style={{
                      border: '1px solid #C8E6C9', borderRadius: '10px', padding: '12px 14px',
                      marginBottom: '8px', background: '#F1F8E9'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              background: '#2E7D32', color: 'white', borderRadius: '6px',
                              padding: '2px 8px', fontSize: '12px', fontWeight: '700'
                            }}>
                              Leito {p.bed_number}
                            </span>
                            {p.patient_name && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#2C3E50' }}>{p.patient_name}</span>
                            )}
                          </div>
                          {p.main_diagnosis && (
                            <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                              📋 {p.main_diagnosis}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {p.active_antibiotics && (
                              <span style={{ fontSize: '11px', color: '#E65100', background: '#FFF3E0', padding: '2px 6px', borderRadius: '4px' }}>
                                💊 {p.active_antibiotics}
                              </span>
                            )}
                            {p.pending_exams && (
                              <span style={{ fontSize: '11px', color: '#1565C0', background: '#E3F2FD', padding: '2px 6px', borderRadius: '4px' }}>
                                🔬 {p.pending_exams}
                              </span>
                            )}
                          </div>
                          {p.relevant_notes && (
                            <div style={{ fontSize: '11px', color: '#777', marginTop: '4px', fontStyle: 'italic' }}>
                              📝 {p.relevant_notes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '8px' }}>
                          <select
                            value={p.current_status}
                            onChange={e => updatePatientStatus(p.id!, e.target.value as any)}
                            style={{
                              padding: '4px 6px', border: '1px solid #C8E6C9', borderRadius: '6px',
                              fontSize: '11px', cursor: 'pointer', background: 'white'
                            }}
                          >
                            <option value="active">🏥 Internado</option>
                            <option value="discharged">🏠 Alta</option>
                            <option value="transferred">🚑 Transferido</option>
                            <option value="deceased">🕊️ Óbito</option>
                          </select>
                          <button
                            onClick={() => deletePatient(p.id!)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF5350', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Pacientes inativos */}
              {inactivePatients.length > 0 && (
                <>
                  <h4 style={{ margin: '16px 0 10px 0', color: '#888', fontSize: '13px', fontWeight: '700' }}>
                    HISTÓRICO ({inactivePatients.length})
                  </h4>
                  {inactivePatients.map(p => {
                    const st = STATUS_LABELS[p.current_status];
                    return (
                      <div key={p.id} style={{
                        border: `1px solid ${st.color}30`, borderRadius: '8px', padding: '10px 12px',
                        marginBottom: '6px', background: st.bg, opacity: 0.8
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: st.color }}>
                              {st.icon} Leito {p.bed_number}
                            </span>
                            {p.patient_name && <span style={{ fontSize: '12px', color: '#555', marginLeft: '8px' }}>{p.patient_name}</span>}
                            {p.main_diagnosis && <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{p.main_diagnosis}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <select
                              value={p.current_status}
                              onChange={e => updatePatientStatus(p.id!, e.target.value as any)}
                              style={{ padding: '3px', border: '1px solid #DDD', borderRadius: '4px', fontSize: '11px' }}
                            >
                              <option value="active">🏥 Internado</option>
                              <option value="discharged">🏠 Alta</option>
                              <option value="transferred">🚑 Transferido</option>
                              <option value="deceased">🕊️ Óbito</option>
                            </select>
                            <button onClick={() => deletePatient(p.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF5350' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {patients.length === 0 && !showAddPatient && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                  <BedDouble size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>Nenhum paciente cadastrado ainda.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Adicione os pacientes do setor para ativar o contexto RAG.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Pendências */}
              <button
                onClick={() => setShowAddPending(!showAddPending)}
                style={{
                  width: '100%', padding: '10px', marginBottom: '16px',
                  background: showAddPending ? '#F5F5F5' : 'linear-gradient(135deg, #E65100, #FF6D00)',
                  color: showAddPending ? '#666' : 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Plus size={16} /> {showAddPending ? 'Cancelar' : 'Adicionar Pendência'}
              </button>

              {showAddPending && (
                <div style={{
                  background: '#FFF3E0', border: '1px solid #FFCC80', borderRadius: '10px',
                  padding: '16px', marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#E65100', display: 'block', marginBottom: '4px' }}>Leito *</label>
                      <input
                        value={newPending.bed_number}
                        onChange={e => setNewPending({ ...newPending, bed_number: e.target.value })}
                        placeholder="Ex: 01"
                        style={{ width: '100%', padding: '8px', border: '1px solid #FFCC80', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#E65100', display: 'block', marginBottom: '4px' }}>Tipo</label>
                      <select
                        value={newPending.item_type}
                        onChange={e => setNewPending({ ...newPending, item_type: e.target.value as any })}
                        style={{ width: '100%', padding: '8px', border: '1px solid #FFCC80', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      >
                        {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#E65100', display: 'block', marginBottom: '4px' }}>Descrição *</label>
                    <input
                      value={newPending.description}
                      onChange={e => setNewPending({ ...newPending, description: e.target.value })}
                      placeholder="Ex: TC de tórax com contraste solicitada"
                      style={{ width: '100%', padding: '8px', border: '1px solid #FFCC80', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    onClick={savePending}
                    disabled={saving || !newPending.bed_number || !newPending.description}
                    style={{
                      width: '100%', padding: '10px', background: '#E65100', color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                    }}
                  >
                    {saving ? 'Salvando...' : '✅ Salvar Pendência'}
                  </button>
                </div>
              )}

              {openPending.length > 0 && (
                <>
                  <h4 style={{ margin: '0 0 10px 0', color: '#E65100', fontSize: '13px', fontWeight: '700' }}>
                    ⏳ PENDENTES ({openPending.length})
                  </h4>
                  {openPending.map(item => (
                    <div key={item.id} style={{
                      border: '1px solid #FFCC80', borderRadius: '10px', padding: '12px 14px',
                      marginBottom: '8px', background: '#FFF8F0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ background: '#E65100', color: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                            Leito {item.bed_number}
                          </span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{ITEM_TYPE_LABELS[item.item_type]}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#2C3E50' }}>{item.description}</div>
                        {item.requested_date && (
                          <div style={{ fontSize: '11px', color: '#AAA', marginTop: '2px' }}>
                            📅 Solicitado em {new Date(item.requested_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => resolvePending(item.id!)}
                        style={{
                          padding: '6px 10px', background: '#4CAF50', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                          display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '8px'
                        }}
                      >
                        <CheckCircle size={12} /> Resolver
                      </button>
                    </div>
                  ))}
                </>
              )}

              {resolvedPending.length > 0 && (
                <>
                  <h4 style={{ margin: '16px 0 10px 0', color: '#888', fontSize: '13px', fontWeight: '700' }}>
                    ✅ RESOLVIDAS ({resolvedPending.length})
                  </h4>
                  {resolvedPending.slice(0, 5).map(item => (
                    <div key={item.id} style={{
                      border: '1px solid #C8E6C9', borderRadius: '8px', padding: '10px 12px',
                      marginBottom: '6px', background: '#F1F8E9', opacity: 0.7
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={14} color="#4CAF50" />
                        <span style={{ fontSize: '12px', color: '#555' }}>
                          <strong>Leito {item.bed_number}:</strong> {item.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {openPending.length === 0 && !showAddPending && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                  <CheckCircle size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>Nenhuma pendência registrada.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #F0F0F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#FAFAFA', borderRadius: '0 0 16px 16px'
        }}>
          <span style={{ fontSize: '12px', color: '#999' }}>
            Atualizado automaticamente a cada round gerado
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', background: '#6C3483', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
