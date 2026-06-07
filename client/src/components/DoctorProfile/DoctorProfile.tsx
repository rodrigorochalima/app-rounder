import { useState, useEffect, useRef } from 'react';
import { User, Save, X, Upload, Eye, EyeOff, QrCode, FileSignature } from 'lucide-react';
import './DoctorProfile.css';

interface DoctorProfileData {
  full_name: string;
  crm: string;
  crm_state: string;
  specialty: string;
  rqe: string;
  phone: string;
  email: string;
  signature_base64: string | null;
  show_crm: boolean;
  show_specialty: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_qrcode: boolean;
  qrcode_url: string;
  footer_text: string;
}

const EMPTY: DoctorProfileData = {
  full_name: '', crm: '', crm_state: '', specialty: '', rqe: '',
  phone: '', email: '', signature_base64: null,
  show_crm: true, show_specialty: true, show_phone: false, show_email: false,
  show_qrcode: false, qrcode_url: '', footer_text: '',
};

interface Props { onClose: () => void; }

export function DoctorProfile({ onClose }: Props) {
  const [profile, setProfile] = useState<DoctorProfileData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/doctor-profile', { headers }).then(r => r.json()).then(d => {
      if (d) setProfile({ ...EMPTY, ...d });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await fetch('/api/doctor-profile', { method: 'PUT', headers, body: JSON.stringify(profile) });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erro ao salvar'); }
      else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    } catch (_) { setError('Erro de conexão'); }
    setSaving(false);
  }

  function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 400; const maxH = 150;
        let w = img.width; let h = img.height;
        if (w > maxW) { h = (h * maxW) / w; w = maxW; }
        if (h > maxH) { w = (w * maxH) / h; h = maxH; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setProfile(prev => ({ ...prev, signature_base64: canvas.toDataURL('image/png') }));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  const set = (field: keyof DoctorProfileData, value: any) => setProfile(prev => ({ ...prev, [field]: value }));

  // Preview do rodapé
  const footerPreview = [
    profile.full_name && `Dr(a). ${profile.full_name}`,
    profile.show_crm && profile.crm && `CRM-${profile.crm_state || 'XX'} ${profile.crm}`,
    profile.show_specialty && profile.specialty,
    profile.rqe && `RQE ${profile.rqe}`,
    profile.show_phone && profile.phone,
    profile.show_email && profile.email,
  ].filter(Boolean).join(' | ');

  if (loading) return null;

  return (
    <div className="dp-overlay">
      <div className="dp-modal">
        <div className="dp-header">
          <div className="dp-header-title"><User size={20} /><h2>Perfil do Médico</h2></div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="dp-body">
          {error && <div className="dp-error">{error}</div>}
          {success && <div className="dp-success">Perfil salvo com sucesso!</div>}

          <div className="dp-section-title">Dados Profissionais</div>
          <div className="dp-field">
            <label>Nome Completo</label>
            <input value={profile.full_name} onChange={e => set('full_name', e.target.value)} placeholder="João da Silva" />
          </div>
          <div className="dp-field-row">
            <div className="dp-field">
              <label>CRM</label>
              <input value={profile.crm} onChange={e => set('crm', e.target.value)} placeholder="12345" />
            </div>
            <div className="dp-field dp-field-sm">
              <label>Estado</label>
              <input value={profile.crm_state} onChange={e => set('crm_state', e.target.value.toUpperCase())} placeholder="GO" maxLength={2} />
            </div>
            <div className="dp-field">
              <label>RQE (opcional)</label>
              <input value={profile.rqe} onChange={e => set('rqe', e.target.value)} placeholder="12345" />
            </div>
          </div>
          <div className="dp-field">
            <label>Especialidade</label>
            <input value={profile.specialty} onChange={e => set('specialty', e.target.value)} placeholder="Medicina Intensiva / Clínica Médica" />
          </div>
          <div className="dp-field-row">
            <div className="dp-field">
              <label>Telefone</label>
              <input value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="(62) 99999-9999" />
            </div>
            <div className="dp-field">
              <label>E-mail</label>
              <input type="email" value={profile.email} onChange={e => set('email', e.target.value)} placeholder="medico@hospital.com" />
            </div>
          </div>

          <div className="dp-section-title">O que aparece no Rodapé</div>
          <div className="dp-toggles">
            {[
              { key: 'show_crm', label: 'CRM' },
              { key: 'show_specialty', label: 'Especialidade' },
              { key: 'show_phone', label: 'Telefone' },
              { key: 'show_email', label: 'E-mail' },
              { key: 'show_qrcode', label: 'QR Code' },
            ].map(({ key, label }) => (
              <label key={key} className="dp-toggle">
                <input type="checkbox" checked={(profile as any)[key]} onChange={e => set(key as any, e.target.checked)} />
                {(profile as any)[key] ? <Eye size={13} /> : <EyeOff size={13} />}
                {label}
              </label>
            ))}
          </div>

          {profile.show_qrcode && (
            <div className="dp-field">
              <label><QrCode size={13} /> URL do QR Code (ex: seu currículo Lattes, site)</label>
              <input value={profile.qrcode_url} onChange={e => set('qrcode_url', e.target.value)} placeholder="https://lattes.cnpq.br/..." />
            </div>
          )}

          <div className="dp-field">
            <label>Texto adicional no rodapé (opcional)</label>
            <input value={profile.footer_text} onChange={e => set('footer_text', e.target.value)} placeholder="Médico Intensivista — Plantonista UTI Adulto" />
          </div>

          {/* Assinatura */}
          <div className="dp-section-title"><FileSignature size={14} /> Assinatura Digital (opcional)</div>
          <div className="dp-signature-section">
            {profile.signature_base64 ? (
              <div className="dp-signature-preview">
                <img src={profile.signature_base64} alt="Assinatura" />
                <button className="dp-btn-remove-sig" onClick={() => set('signature_base64', null)}><X size={12} /> Remover</button>
              </div>
            ) : (
              <button className="dp-btn-upload-sig" onClick={() => sigInputRef.current?.click()}>
                <Upload size={14} /> Carregar imagem da assinatura
              </button>
            )}
            <input ref={sigInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSignatureUpload} />
            <p className="dp-sig-hint">PNG com fundo branco recomendado. Aparecerá acima do nome no rodapé do documento.</p>
          </div>

          {/* Preview do rodapé */}
          <div className="dp-footer-preview">
            <div className="dp-footer-preview-label">Prévia do Rodapé</div>
            <div className="dp-footer-preview-box">
              {profile.signature_base64 && <img src={profile.signature_base64} alt="Assinatura" className="dp-footer-sig" />}
              <div className="dp-footer-text">{footerPreview || 'Preencha os dados acima para ver a prévia'}</div>
            </div>
          </div>
        </div>

        <div className="dp-footer">
          <button className="dp-btn-secondary" onClick={onClose}>Fechar</button>
          <button className="dp-btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}
