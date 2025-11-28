import React, { useState, useEffect } from 'react';
import { User } from '../../types/auth.types';
import { authService } from '../../services/auth/auth.service';
import './UserProfile.css';

interface UserProfileProps {
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    crm: '',
    crm_state: '',
    specialty: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await authService.getCurrentSession();
      if (currentUser) {
        setUser(currentUser);
        setFormData({
          full_name: currentUser.full_name || '',
          crm: currentUser.crm || '',
          crm_state: currentUser.crm_state || '',
          specialty: currentUser.specialty || '',
          phone: currentUser.phone || '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados do usuário' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await authService.updateUserProfile(formData);
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setIsEditing(false);
      await loadUserData();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 8 caracteres' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await authService.updatePassword(passwordData.newPassword);
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao alterar senha' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!user) {
    return (
      <div className="user-profile-modal">
        <div className="user-profile-content">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-modal" onClick={onClose}>
      <div className="user-profile-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h2>{user.full_name}</h2>
          <p className="profile-email">{user.email}</p>
          <span className="profile-role-badge">{user.role}</span>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-sections">
          {/* Seção de Dados do Perfil */}
          <div className="profile-section">
            <div className="section-header">
              <h3>📋 Dados do Perfil</h3>
              {!isEditing && (
                <button 
                  className="btn-edit" 
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            <div className="profile-fields">
              <div className="field-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label>CRM</label>
                  <input
                    type="text"
                    name="crm"
                    value={formData.crm}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="field-group">
                  <label>UF</label>
                  <input
                    type="text"
                    name="crm_state"
                    value={formData.crm_state}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Especialidade</label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="field-group">
                <label>Telefone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {isEditing && (
              <div className="section-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => {
                    setIsEditing(false);
                    loadUserData();
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-save" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            )}
          </div>

          {/* Seção de Alteração de Senha */}
          <div className="profile-section">
            <div className="section-header">
              <h3>🔒 Segurança</h3>
              {!isChangingPassword && (
                <button 
                  className="btn-edit" 
                  onClick={() => setIsChangingPassword(true)}
                >
                  Alterar Senha
                </button>
              )}
            </div>

            {isChangingPassword && (
              <>
                <div className="profile-fields">
                  <div className="field-group">
                    <label>Nova Senha</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>

                  <div className="field-group">
                    <label>Confirmar Nova Senha</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Digite a senha novamente"
                    />
                  </div>
                </div>

                <div className="section-actions">
                  <button 
                    className="btn-cancel" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn-save" 
                    onClick={handleChangePassword}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Seção de Ações */}
          <div className="profile-section">
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
