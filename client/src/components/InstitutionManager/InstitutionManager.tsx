import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Edit2, Trash2, Star, MapPin, Phone, Mail, X, Save, Upload, ExternalLink } from 'lucide-react';
import './InstitutionManager.css';

interface Institution {
  id: string;
  name: string;
  short_name: string;
  logo_base64: string | null;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  cnpj: string;
  cnes: string;
  gps_lat: number | null;
  gps_lng: number | null;
  maps_url: string;
  total_beds: number;
  icu_type: string;
  header_color: string;
  header_text_color: string;
  is_default: boolean;
}

const EMPTY_INSTITUTION: Partial<Institution> = {
  name: '', short_name: '', logo_base64: null, address: '', city: '', state: '',
  phone: '', email: '', cnpj: '', cnes: '', maps_url: '',
  total_beds: 10, icu_type: 'UTI Adulto',
  header_color: '#1e3a5f', header_text_color: '#ffffff', is_default: false,
};

interface Props {
  onClose: () => void;
}

export function InstitutionManager({ onClose }: Props) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Institution> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadInstitutions(); }, []);

  async function loadInstitutions() {
    setLoading(true);
    try {
      const res = await fetch('/api/institutions', { headers });
      if (res.ok) setInstitutions(await res.json());
    } catch (_) {}
    setLoading(false);
  }

  async function handleSave() {
    if (!editing?.name) { setError('Nome da instituição é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      const url = isNew ? '/api/institutions' : `/api/institutions/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers, body: JSON.stringify(editing) });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erro ao salvar'); setSaving(false); return; }
      await loadInstitutions();
      setEditing(null);
    } catch (_) { setError('Erro de conexão'); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta instituição?')) return;
    await fetch(`/api/institutions/${id}`, { method: 'DELETE', headers });
    await loadInstitutions();
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/institutions/${id}`, { method: 'PUT', headers, body: JSON.stringify({ ...institutions.find(i => i.id === id), is_default: true }) });
    await loadInstitutions();
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // Redimensionar para máximo 200x80px
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 300; const maxH = 120;
        let w = img.width; let h = img.height;
        if (w > maxW) { h = (h * maxW) / w; w = maxW; }
        if (h > maxH) { w = (w * maxH) / h; h = maxH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        setEditing(prev => ({ ...prev, logo_base64: canvas.toDataURL('image/png') }));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  function handleGetGPS() {
    if (!navigator.geolocation) { setError('GPS não disponível'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setEditing(prev => ({ ...prev, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude })),
      () => setError('Não foi possível obter localização')
    );
  }

  if (editing) {
    return (
      <div className="im-overlay">
        <div className="im-modal">
          <div className="im-modal-header">
            <h2>{isNew ? '+ Nova Instituição' : 'Editar Instituição'}</h2>
            <button onClick={() => setEditing(null)}><X size={20} /></button>
          </div>
          <div className="im-modal-body">
            {error && <div className="im-error">{error}</div>}

            {/* Logo */}
            <div className="im-logo-section">
              <div className="im-logo-preview" style={{ background: editing.header_color || '#1e3a5f' }}>
                {editing.logo_base64
                  ? <img src={editing.logo_base64} alt="Logo" />
                  : <Building2 size={40} color={editing.header_text_color || '#fff'} />}
              </div>
              <div className="im-logo-actions">
                <button className="im-btn-secondary" onClick={() => logoInputRef.current?.click()}>
                  <Upload size={14} /> Carregar Logo
                </button>
                {editing.logo_base64 && (
                  <button className="im-btn-danger-sm" onClick={() => setEditing(prev => ({ ...prev, logo_base64: null }))}>
                    <X size={14} /> Remover
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <p className="im-logo-hint">PNG, JPG ou SVG — máx. 2MB. Será redimensionado para o cabeçalho.</p>
              </div>
            </div>

            {/* Cores do cabeçalho */}
            <div className="im-field-row">
              <div className="im-field">
                <label>Cor do Cabeçalho</label>
                <div className="im-color-row">
                  <input type="color" value={editing.header_color || '#1e3a5f'} onChange={e => setEditing(prev => ({ ...prev, header_color: e.target.value }))} />
                  <span>{editing.header_color || '#1e3a5f'}</span>
                </div>
              </div>
              <div className="im-field">
                <label>Cor do Texto</label>
                <div className="im-color-row">
                  <input type="color" value={editing.header_text_color || '#ffffff'} onChange={e => setEditing(prev => ({ ...prev, header_text_color: e.target.value }))} />
                  <span>{editing.header_text_color || '#ffffff'}</span>
                </div>
              </div>
            </div>

            {/* Dados principais */}
            <div className="im-field">
              <label>Nome Completo *</label>
              <input value={editing.name || ''} onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))} placeholder="Hospital Geral do Senador Canedo" />
            </div>
            <div className="im-field-row">
              <div className="im-field">
                <label>Nome Curto</label>
                <input value={editing.short_name || ''} onChange={e => setEditing(prev => ({ ...prev, short_name: e.target.value }))} placeholder="HGSC" />
              </div>
              <div className="im-field">
                <label>Tipo de UTI</label>
                <select value={editing.icu_type || 'UTI Adulto'} onChange={e => setEditing(prev => ({ ...prev, icu_type: e.target.value }))}>
                  <option>UTI Adulto</option>
                  <option>UTI Neonatal</option>
                  <option>UTI Pediátrica</option>
                  <option>UTI Coronariana</option>
                  <option>Semi-Intensiva</option>
                  <option>Clínica Médica</option>
                  <option>Enfermaria Cirúrgica</option>
                </select>
              </div>
              <div className="im-field im-field-sm">
                <label>Leitos</label>
                <input type="number" min={1} max={100} value={editing.total_beds || 10} onChange={e => setEditing(prev => ({ ...prev, total_beds: parseInt(e.target.value) }))} />
              </div>
            </div>

            {/* Endereço */}
            <div className="im-field">
              <label>Endereço</label>
              <input value={editing.address || ''} onChange={e => setEditing(prev => ({ ...prev, address: e.target.value }))} placeholder="Rua, número, bairro" />
            </div>
            <div className="im-field-row">
              <div className="im-field">
                <label>Cidade</label>
                <input value={editing.city || ''} onChange={e => setEditing(prev => ({ ...prev, city: e.target.value }))} placeholder="Senador Canedo" />
              </div>
              <div className="im-field im-field-sm">
                <label>Estado</label>
                <input value={editing.state || ''} onChange={e => setEditing(prev => ({ ...prev, state: e.target.value }))} placeholder="GO" maxLength={2} />
              </div>
            </div>

            {/* Contato */}
            <div className="im-field-row">
              <div className="im-field">
                <label>Telefone</label>
                <input value={editing.phone || ''} onChange={e => setEditing(prev => ({ ...prev, phone: e.target.value }))} placeholder="(62) 3333-4444" />
              </div>
              <div className="im-field">
                <label>E-mail</label>
                <input type="email" value={editing.email || ''} onChange={e => setEditing(prev => ({ ...prev, email: e.target.value }))} placeholder="contato@hospital.gov.br" />
              </div>
            </div>

            {/* Registros */}
            <div className="im-field-row">
              <div className="im-field">
                <label>CNPJ</label>
                <input value={editing.cnpj || ''} onChange={e => setEditing(prev => ({ ...prev, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
              </div>
              <div className="im-field">
                <label>CNES</label>
                <input value={editing.cnes || ''} onChange={e => setEditing(prev => ({ ...prev, cnes: e.target.value }))} placeholder="0000000" />
              </div>
            </div>

            {/* GPS e Maps */}
            <div className="im-field">
              <label>Link do Google Maps</label>
              <div className="im-maps-row">
                <input value={editing.maps_url || ''} onChange={e => setEditing(prev => ({ ...prev, maps_url: e.target.value }))} placeholder="https://maps.google.com/..." />
                {editing.maps_url && <a href={editing.maps_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>}
              </div>
            </div>
            <div className="im-field-row">
              <div className="im-field">
                <label>Latitude GPS</label>
                <input type="number" step="any" value={editing.gps_lat || ''} onChange={e => setEditing(prev => ({ ...prev, gps_lat: parseFloat(e.target.value) }))} placeholder="-16.7234" />
              </div>
              <div className="im-field">
                <label>Longitude GPS</label>
                <input type="number" step="any" value={editing.gps_lng || ''} onChange={e => setEditing(prev => ({ ...prev, gps_lng: parseFloat(e.target.value) }))} placeholder="-49.0912" />
              </div>
              <button className="im-btn-gps" onClick={handleGetGPS}><MapPin size={14} /> Usar GPS</button>
            </div>

            {/* Default */}
            <label className="im-checkbox-row">
              <input type="checkbox" checked={editing.is_default || false} onChange={e => setEditing(prev => ({ ...prev, is_default: e.target.checked }))} />
              Definir como instituição padrão
            </label>
          </div>
          <div className="im-modal-footer">
            <button className="im-btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="im-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Instituição'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="im-overlay">
      <div className="im-list-modal">
        <div className="im-modal-header">
          <div className="im-header-title">
            <Building2 size={22} />
            <h2>Instituições</h2>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="im-list-body">
          {loading ? (
            <div className="im-loading">Carregando...</div>
          ) : institutions.length === 0 ? (
            <div className="im-empty">
              <Building2 size={48} opacity={0.3} />
              <p>Nenhuma instituição cadastrada</p>
              <p className="im-empty-hint">Adicione o hospital ou clínica onde você trabalha para personalizar o cabeçalho dos documentos gerados.</p>
            </div>
          ) : (
            <div className="im-list">
              {institutions.map(inst => (
                <div key={inst.id} className={`im-item ${inst.is_default ? 'im-item-default' : ''}`}>
                  <div className="im-item-logo" style={{ background: inst.header_color || '#1e3a5f' }}>
                    {inst.logo_base64
                      ? <img src={inst.logo_base64} alt={inst.short_name || inst.name} />
                      : <Building2 size={24} color={inst.header_text_color || '#fff'} />}
                  </div>
                  <div className="im-item-info">
                    <div className="im-item-name">
                      {inst.name}
                      {inst.is_default && <span className="im-badge-default"><Star size={10} /> Padrão</span>}
                    </div>
                    <div className="im-item-details">
                      {inst.city && inst.state && <span><MapPin size={11} /> {inst.city}/{inst.state}</span>}
                      {inst.phone && <span><Phone size={11} /> {inst.phone}</span>}
                      {inst.icu_type && <span>{inst.icu_type} • {inst.total_beds} leitos</span>}
                    </div>
                  </div>
                  <div className="im-item-actions">
                    {!inst.is_default && (
                      <button className="im-btn-icon" title="Definir como padrão" onClick={() => handleSetDefault(inst.id)}><Star size={15} /></button>
                    )}
                    <button className="im-btn-icon" title="Editar" onClick={() => { setEditing(inst); setIsNew(false); }}><Edit2 size={15} /></button>
                    <button className="im-btn-icon im-btn-icon-danger" title="Remover" onClick={() => handleDelete(inst.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="im-modal-footer">
          <button className="im-btn-secondary" onClick={onClose}>Fechar</button>
          <button className="im-btn-primary" onClick={() => { setEditing({ ...EMPTY_INSTITUTION }); setIsNew(true); }}>
            <Plus size={16} /> Nova Instituição
          </button>
        </div>
      </div>
    </div>
  );
}
