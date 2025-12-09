import React, { useState, useEffect } from 'react';
import { authService } from '@/services/auth';
import { ProfilePanel } from '../ProfilePanel/ProfilePanel';
import { APIConfig } from '../APIConfig/APIConfig';
import APIManager from '../APIManager/APIManager';
import { RulesPanel } from '../RulesPanel/RulesPanel';
import './Header.css';

export const Header: React.FC = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [showAPIConfig, setShowAPIConfig] = useState(false);
  const [showAPIManager, setShowAPIManager] = useState(false);
  const [showRules, setShowRules] = useState(false);
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
            <div className="header-logo-container">
              <img 
                src="/rounder-icon.png" 
                alt="Rounder" 
                className="header-logo-icon"
              />
              <div className="header-logo-text">
                <h1>Rounder</h1>
                <span className="header-subtitle">Gerador Inteligente de Rounds Médicos</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button 
              className="header-btn btn-rules"
              onClick={() => setShowRules(true)}
              title="Gerenciar Regras"
            >
              📝 Regras
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

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showAPIConfig && <APIConfig onClose={() => setShowAPIConfig(false)} />}
      {showAPIManager && <APIManager onClose={() => setShowAPIManager(false)} />}
      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
    </>
  );
};

export default Header;
