import React, { useState, useEffect } from 'react';
import { authService } from '@/services/auth';
import { UserProfile } from '../UserProfile/UserProfile';
import { APIConfig } from '../APIConfig/APIConfig';
import './Header.css';

export const Header: React.FC = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [showAPIConfig, setShowAPIConfig] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (session?.user) {
        setUserName(session.user.fullName || session.user.email);
      }
    } catch (error) {
      console.error('Erro ao carregar nome do usuário:', error);
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <h1>🩺 Rounder</h1>
            <span className="header-subtitle">Gerador Inteligente de Rounds Médicos</span>
          </div>

          <div className="header-actions">
            <button 
              className="header-btn btn-api-config"
              onClick={() => setShowAPIConfig(true)}
              title="Configurar APIs"
            >
              🔑 APIs
            </button>

            <button 
              className="header-btn btn-profile"
              onClick={() => setShowProfile(true)}
              title="Meu Perfil"
            >
              <div className="profile-avatar-small">
                {userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="profile-name">{userName || 'Perfil'}</span>
            </button>
          </div>
        </div>
      </header>

      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      {showAPIConfig && <APIConfig onClose={() => setShowAPIConfig(false)} />}
    </>
  );
};
