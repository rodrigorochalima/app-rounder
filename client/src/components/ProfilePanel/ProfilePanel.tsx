/**
 * Painel de Perfil Completo
 * Com abas: Dados Pessoais, Segurança, APIs, Templates, Configurações
 */

import { useState, useEffect } from 'react';
import { 
  X, User, Lock, Key, FileText, Settings, 
  Upload, Eye, EyeOff, Save, Camera 
} from 'lucide-react';
import { authService } from '@/services/auth';
import APIManager from '../APIManager/APIManager';
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

  // Segurança
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        setInstitution(session.user.institution || '');
        setPhone(session.user.phone || '');
        setLogoUrl(session.user.logoUrl || '');
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
      await authService.updateProfile({
        fullName,
        specialty,
        crm,
        crmState,
        institution,
        phone
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

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
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
                <label>Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
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
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="profile-panel-password-toggle"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <small>Mínimo de 6 caracteres</small>
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
              <APIManager onClose={() => {}} embedded />
            </div>
          )}

          {/* Aba: Templates */}
          {activeTab === 'templates' && (
            <div className="profile-panel-templates">
              <h3>Templates de Impressão</h3>
              <p className="profile-panel-placeholder">
                🚧 Em desenvolvimento<br />
                Aqui você poderá criar e gerenciar templates personalizados para impressão de rounds.
              </p>
            </div>
          )}

          {/* Aba: Configurações */}
          {activeTab === 'settings' && (
            <div className="profile-panel-settings">
              <h3>Configurações</h3>
              <p className="profile-panel-placeholder">
                🚧 Em desenvolvimento<br />
                Aqui você poderá configurar tema, idioma, notificações e outras preferências.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePanel;
