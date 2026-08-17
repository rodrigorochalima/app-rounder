/**
 * Painel de Perfil Completo
 * Com abas: Dados Pessoais, Segurança, APIs, Templates, Configurações
 */

import { useState, useEffect } from 'react';
import { 
  X, User, Lock, Key, FileText, Settings, 
  Upload, Eye, EyeOff, Save, Camera, Download, LogOut, ShieldAlert, Trash2
} from 'lucide-react';
import { authService } from '@/services/auth';
import { accountAPI, legalAPI } from '@/lib/api';
import APIManager from '../APIManager/APIManager';
import { TemplateEditor, TemplateData } from '../TemplateEditor/TemplateEditor';
import './ProfilePanel.css';

interface ProfilePanelProps {
  onClose: () => void;
}

type Tab = 'personal' | 'security' | 'apis' | 'templates' | 'settings';

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Dados Pessoais
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [crm, setCrm] = useState('');
  const [crmState, setCrmState] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [position, setPosition] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');

  // Segurança
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Privacidade, sessões e controle de conta
  const [sessions, setSessions] = useState<any[]>([]);
  const [legalAcceptances, setLegalAcceptances] = useState<any[]>([]);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (session?.user) {
        setFullName(session.user.fullName || '');
        setEmail(session.user.email || '');
        setSpecialty(session.user.specialty || '');
        setCrm(session.user.crm || '');
        setCrmState(session.user.crmState || '');
        setInstitution(session.user.hospitalName || '');
        setPhone(session.user.phone || '');
        setLogoUrl(session.user.logoUrl || '');
        setHospitalName(session.user.hospitalName || '');
        setHospitalPhone(session.user.hospitalPhone || '');
        setPosition(session.user.position || '');
        setPersonalPhone(session.user.personalPhone || '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.updateUserProfile({
        fullName,
        specialty,
        crm,
        crmState,
        phone,
        hospitalName: hospitalName || institution,
        hospitalPhone,
        position,
        personalPhone
      });
      setSuccess('Dados salvos com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (newPassword.length < 10) {
      setError('A senha deve ter no mínimo 10 caracteres');
      setLoading(false);
      return;
    }

    try {
      await authService.updatePassword(currentPassword, newPassword);
      setSuccess('Senha alterada. Por segurança, entre novamente em todos os dispositivos.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.setTimeout(() => { window.location.href = '/auth'; }, 1400);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const loadPrivacyControls = async () => {
    try {
      const [activeSessions, legalData] = await Promise.all([
        authService.listSessions(),
        legalAPI.listAcceptances(),
      ]);
      setSessions(activeSessions);
      setLegalAcceptances(legalData.data || []);
    } catch (err) {
      console.error('Erro ao carregar controles de privacidade:', err);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await accountAPI.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `app-rounder-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess('Exportação preparada. O download foi iniciado.');
    } catch (err: any) {
      setError(err.message || 'Não foi possível exportar seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoading(true);
    try {
      await authService.logoutAll();
      window.location.href = '/auth';
    } catch (err: any) {
      setError(err.message || 'Não foi possível encerrar as sessões.');
      setLoading(false);
    }
  };

  const handleAcceptLegal = async (documentType: 'terms' | 'privacy' | 'clinical_ai_notice') => {
    setLoading(true);
    try {
      await legalAPI.accept(documentType);
      await loadPrivacyControls();
      setSuccess('Aceite registrado com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Não foi possível registrar o aceite.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await accountAPI.deleteAccount(deletePassword, deleteConfirmation);
      window.location.href = '/auth';
    } catch (err: any) {
      setError(err.message || 'Não foi possível excluir a conta.');
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: TemplateData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Salvar template no Supabase
      console.log('Template salvo:', templateData);
      setSuccess('Template salvo com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Implementar upload para Supabase Storage
      // const url = await authService.uploadLogo(file);
      // setLogoUrl(url);
      setSuccess('Logo enviado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar logo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') loadPrivacyControls();
  }, [activeTab]);

  const tabs = [
    { id: 'personal' as Tab, label: 'Dados Pessoais', icon: User },
    { id: 'security' as Tab, label: 'Segurança', icon: Lock },
    { id: 'apis' as Tab, label: 'APIs', icon: Key },
    { id: 'templates' as Tab, label: 'Templates', icon: FileText },
    { id: 'settings' as Tab, label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="profile-panel-overlay" onClick={onClose}>
      <div className="profile-panel-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-panel-header">
          <h2>Meu Perfil</h2>
          <button onClick={onClose} className="profile-panel-close">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-panel-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`profile-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="profile-panel-content">
          {/* Mensagens */}
          {success && (
            <div className="profile-panel-message success">
              ✅ {success}
            </div>
          )}
          {error && (
            <div className="profile-panel-message error">
              ❌ {error}
            </div>
          )}

          {/* Aba: Dados Pessoais */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSavePersonalData} className="profile-panel-form">
              <h3>Dados Pessoais</h3>

              {/* Logo Institucional */}
              <div className="profile-panel-field">
                <label>Logo da Instituição</label>
                <div className="profile-panel-logo-upload">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="profile-panel-logo-preview" />
                  ) : (
                    <div className="profile-panel-logo-placeholder">
                      <Camera size={32} />
                      <span>Sem logo</span>
                    </div>
                  )}
                  <label className="profile-panel-logo-btn">
                    <Upload size={18} />
                    <span>Enviar Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <small>PNG, JPG ou SVG. Máximo 2MB.</small>
              </div>

              {/* Nome Completo */}
              <div className="profile-panel-field">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. João Silva"
                />
              </div>

              {/* Email (não editável) */}
              <div className="profile-panel-field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="disabled"
                />
                <small>O email não pode ser alterado</small>
              </div>

              {/* CRM e UF */}
              <div className="profile-panel-field-group">
                <div className="profile-panel-field">
                  <label>CRM</label>
                  <input
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="123456"
                  />
                </div>
                <div className="profile-panel-field">
                  <label>UF</label>
                  <input
                    type="text"
                    value={crmState}
                    onChange={(e) => setCrmState(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>

              {/* Especialidade */}
              <div className="profile-panel-field">
                <label>Especialidade</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Cardiologia"
                />
              </div>

              {/* Instituição */}
              <div className="profile-panel-field">
                <label>Instituição</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Hospital XYZ"
                />
              </div>

              {/* Telefone */}
              <div className="profile-panel-field">
                <label>Telefone Pessoal</label>
                <input
                  type="tel"
                  value={personalPhone}
                  onChange={(e) => setPersonalPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Cargo */}
              <div className="profile-panel-field">
                <label>Cargo/Função</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Médico Residente, Preceptor, etc."
                />
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Dados do Hospital</h4>

              {/* Nome do Hospital */}
              <div className="profile-panel-field">
                <label>Nome do Hospital</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Hospital das Clínicas"
                />
              </div>

              {/* Telefone do Hospital */}
              <div className="profile-panel-field">
                <label>Telefone do Hospital</label>
                <input
                  type="tel"
                  value={hospitalPhone}
                  onChange={(e) => setHospitalPhone(e.target.value)}
                  placeholder="(11) 3333-3333"
                />
              </div>

              <button type="submit" className="profile-panel-btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          )}

          {/* Aba: Segurança */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="profile-panel-form">
              <h3>Alterar Senha</h3>

              {/* Senha Atual */}
              <div className="profile-panel-field">
                <label>Senha Atual</label>
                <div className="profile-panel-password-field">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="profile-panel-password-toggle"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div className="profile-panel-field">
                <label>Nova Senha</label>
                <div className="profile-panel-password-field">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="profile-panel-password-toggle"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <small>Mínimo de 10 caracteres. Ao confirmar, todas as sessões serão encerradas.</small>
              </div>

              {/* Confirmar Nova Senha */}
              <div className="profile-panel-field">
                <label>Confirmar Nova Senha</label>
                <div className="profile-panel-password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="profile-panel-password-toggle"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="profile-panel-btn-primary" disabled={loading}>
                <Lock size={18} />
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          )}

          {/* Aba: APIs */}
          {activeTab === 'apis' && (
            <div className="profile-panel-apis">
              <APIManager onClose={() => {}} />
            </div>
          )}

          {/* Aba: Templates */}
          {activeTab === 'templates' && (
            <div className="profile-panel-templates">
              <TemplateEditor onSave={handleSaveTemplate} />
            </div>
          )}

          {/* Aba: Privacidade e conta */}
          {activeTab === 'settings' && (
            <div className="profile-panel-settings" style={{ display: 'grid', gap: 18 }}>
              <div>
                <h3 style={{ marginBottom: 6 }}>Privacidade e conta</h3>
                <p style={{ marginTop: 0, color: '#5c7080', lineHeight: 1.5 }}>Controle suas sessões, seus dados e os documentos aceitos. Dados clínicos devem ser revisados e usados conforme as políticas da instituição.</p>
              </div>

              <section style={{ border: '1px solid #dce8f3', borderRadius: 10, padding: 16 }}>
                <h4 style={{ marginTop: 0 }}>Sessões ativas</h4>
                <p style={{ fontSize: 13, color: '#5c7080' }}>{sessions.length ? `${sessions.length} sessão(ões) ativa(s) identificada(s).` : 'Nenhuma sessão ativa adicional identificada.'}</p>
                <button type="button" className="profile-panel-btn-primary" onClick={handleLogoutAll} disabled={loading} style={{ background: '#496b82' }}>
                  <LogOut size={18} /> Encerrar todas as sessões
                </button>
              </section>

              <section style={{ border: '1px solid #dce8f3', borderRadius: 10, padding: 16 }}>
                <h4 style={{ marginTop: 0 }}>Seus dados</h4>
                <p style={{ fontSize: 13, color: '#5c7080', lineHeight: 1.5 }}>Baixe um arquivo JSON com perfil, regras, histórico, contexto clínico, instituições e metadados de chaves. Chaves secretas não são incluídas.</p>
                <button type="button" className="profile-panel-btn-primary" onClick={handleExportData} disabled={loading}>
                  <Download size={18} /> Exportar meus dados
                </button>
              </section>

              <section style={{ border: '1px solid #dce8f3', borderRadius: 10, padding: 16 }}>
                <h4 style={{ marginTop: 0 }}>Documentos e aceites</h4>
                <p style={{ fontSize: 13, color: '#5c7080' }}>Últimos aceites registrados: {legalAcceptances.length || 'nenhum'}.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <a href="/legal/terms" target="_blank" rel="noreferrer">Termos de Uso</a>
                  <a href="/legal/privacy" target="_blank" rel="noreferrer">Política de Privacidade</a>
                  <a href="/legal/clinical-ai" target="_blank" rel="noreferrer">Aviso clínico e IA</a>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={() => handleAcceptLegal('terms')} disabled={loading}>Registrar aceite dos Termos</button>
                  <button type="button" onClick={() => handleAcceptLegal('privacy')} disabled={loading}>Registrar aceite de Privacidade</button>
                </div>
              </section>

              <section style={{ border: '1px solid #f0c7c7', background: '#fff8f8', borderRadius: 10, padding: 16 }}>
                <h4 style={{ marginTop: 0, color: '#a52e2e' }}><ShieldAlert size={17} style={{ verticalAlign: 'text-bottom' }} /> Zona de exclusão</h4>
                <p style={{ fontSize: 13, color: '#6f3a3a', lineHeight: 1.5 }}>A exclusão remove a conta e os dados associados. Essa ação é irreversível. Exporte os dados antes de continuar.</p>
                {!showDeleteAccount ? (
                  <button type="button" onClick={() => setShowDeleteAccount(true)} style={{ color: '#a52e2e' }}><Trash2 size={16} /> Excluir minha conta</button>
                ) : (
                  <form onSubmit={handleDeleteAccount} style={{ display: 'grid', gap: 10 }}>
                    <input type="password" required placeholder="Digite sua senha atual" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
                    <input type="text" required placeholder="Digite EXCLUIR MINHA CONTA" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
                    <button type="submit" disabled={loading} style={{ background: '#a52e2e', color: '#fff' }}>Confirmar exclusão irreversível</button>
                  </form>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePanel;
