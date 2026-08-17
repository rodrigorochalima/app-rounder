import React, { useState, useEffect } from 'react';
import { authService } from '@/services/auth';
import { ProfilePanel } from '../ProfilePanel/ProfilePanel';
import APIManager from '../APIManager/APIManager';
import { RulesPanel } from '../RulesPanel/RulesPanel';
import { InstitutionManager } from '../InstitutionManager/InstitutionManager';
import { DoctorProfile } from '../DoctorProfile/DoctorProfile';
import { SISOpPanel } from '../SISOP/SISOpPanel';
import './Header.css';

export const Header: React.FC = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [showAPIManager, setShowAPIManager] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showInstitutions, setShowInstitutions] = useState(false);
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [showSISOP, setShowSISOP] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('rotineiro');
  const [hasUpdates, setHasUpdates] = useState(false);
  const canAccessSisop = ['sisop', 'admin'].includes(userRole);

  useEffect(() => {
    loadUserName();
  }, []);

  useEffect(() => {
    if (canAccessSisop) checkForUpdates();
  }, [canAccessSisop]);

  const loadUserName = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (session?.user) {
        setUserName(session.user.fullName || session.user.email);
        setUserRole(session.user.role || 'rotineiro');
      }
    } catch (error) {
      console.error('Erro ao carregar nome do usuário:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/sisop/versions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const versions = await res.json();
        setHasUpdates(versions.some((v: any) => v.update_available));
      }
    } catch (_) {}
  };

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <div className="header-logo-container">
              <img src="/rounder-icon.png" alt="Rounder" className="header-logo-icon" />
              <div className="header-logo-text">
                <h1>Rounder</h1>
                <span className="header-subtitle">Gerador Inteligente de Rounds Médicos</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button className="header-btn btn-rules" onClick={() => setShowRules(true)} title="Gerenciar Regras">
              📝 Regras
            </button>

            <button className="header-btn btn-api" onClick={() => setShowAPIManager(true)} title="Configurar API Keys">
              🔑 APIs
            </button>

            <button className="header-btn btn-institution" onClick={() => setShowInstitutions(true)} title="Instituições">
              🏥 Hospital
            </button>

            <button className="header-btn btn-doctor" onClick={() => setShowDoctorProfile(true)} title="Perfil do Médico">
              👨‍⚕️ Médico
            </button>

            {canAccessSisop && (
              <button className="header-btn btn-sisop" onClick={() => setShowSISOP(true)} title="Sistema Operacional">
                ⚙️ SISOP
                {hasUpdates && <span className="header-update-dot" />}
              </button>
            )}

            <button className="header-btn btn-profile" onClick={() => setShowProfile(true)} title="Meu Perfil">
              <div className="profile-avatar-small">
                {userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="profile-name">{userName || 'Perfil'}</span>
            </button>
          </div>
        </div>
      </header>

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showAPIManager && <APIManager onClose={() => setShowAPIManager(false)} />}
      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
      {showInstitutions && <InstitutionManager onClose={() => setShowInstitutions(false)} />}
      {showDoctorProfile && <DoctorProfile onClose={() => setShowDoctorProfile(false)} />}
      {showSISOP && canAccessSisop && <SISOpPanel onClose={() => { setShowSISOP(false); checkForUpdates(); }} />}
    </>
  );
};

export default Header;
