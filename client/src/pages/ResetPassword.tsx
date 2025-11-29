import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import './AuthPage.css';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verificar se há um token de recuperação na URL
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (!accessToken || type !== 'recovery') {
      setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
    }
  }, [location]);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) {
      return 'A senha deve ter pelo menos 8 caracteres';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!/[a-z]/.test(pass)) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!/[0-9]/.test(pass)) {
      return 'A senha deve conter pelo menos um número';
    }
    if (!/[^A-Za-z0-9]/.test(pass)) {
      return 'A senha deve conter pelo menos um caractere especial (@, #, $, etc.)';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setError(err.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-icon">🏥</div>
            <h1>Rounder</h1>
            <p>Gerador Inteligente de Rounds Médicos</p>
          </div>

          <div className="success-message" style={{
            padding: '24px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#166534', marginBottom: '12px' }}>Senha Redefinida com Sucesso!</h2>
            <p style={{ color: '#15803d', marginBottom: '8px' }}>
              Sua senha foi alterada com segurança.
            </p>
            <p style={{ color: '#16a34a', fontSize: '14px' }}>
              Redirecionando para o login em 3 segundos...
            </p>
          </div>

          <button
            onClick={() => navigate('/auth')}
            className="auth-button"
            style={{ marginTop: '24px' }}
          >
            Ir para Login Agora
          </button>
        </div>

        <div className="auth-footer">
          <p>Nexo Soluções Digitais</p>
          <p>App Rounder - Gerador Inteligente de Rounds Médicos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🔐</div>
          <h1>Redefinir Senha</h1>
          <p>Crie uma nova senha segura para sua conta</p>
        </div>

        {error && (
          <div className="error-message" style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '2px solid #fca5a5',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                disabled={isLoading}
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite novamente sua nova senha"
              disabled={isLoading}
            />
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: '0 0 8px', color: '#0c4a6e', fontWeight: '600', fontSize: '14px' }}>
              💡 Requisitos de Segurança:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#075985', fontSize: '13px', lineHeight: '1.6' }}>
              <li>Mínimo de 8 caracteres</li>
              <li>Pelo menos uma letra maiúscula (A-Z)</li>
              <li>Pelo menos uma letra minúscula (a-z)</li>
              <li>Pelo menos um número (0-9)</li>
              <li>Pelo menos um caractere especial (@, #, $, etc.)</li>
            </ul>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Redefinindo...' : '🔒 Redefinir Senha'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="auth-button-secondary"
            disabled={isLoading}
            style={{ marginTop: '12px' }}
          >
            ← Voltar ao Login
          </button>
        </form>
      </div>

      <div className="auth-footer">
        <p>Nexo Soluções Digitais</p>
        <p>App Rounder - Gerador Inteligente de Rounds Médicos</p>
      </div>
    </div>
  );
};

export default ResetPassword;
