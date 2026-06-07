/**
 * Página de Redefinição de Senha
 * Lê o token da URL e permite criar uma nova senha
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setError('Link inválido. Solicite um novo e-mail de redefinição de senha.');
    } else {
      setToken(t);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Erro ao redefinir senha.');
      } else {
        setSuccess(true);
        setTimeout(() => setLocation('/auth'), 3000);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/rounder-icon.png" alt="App Rounder" style={{ width: '64px', height: '64px', borderRadius: '14px' }} />
          <h1 style={{ margin: '12px 0 4px', fontSize: '22px', color: '#333', fontWeight: 700 }}>Rounder</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Redefinição de senha</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#2e7d32', margin: '0 0 8px' }}>Senha redefinida!</h2>
            <p style={{ color: '#555', lineHeight: 1.6 }}>
              Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes...
            </p>
            <button
              onClick={() => setLocation('/auth')}
              style={{
                marginTop: '20px',
                background: '#4A90D9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#ffebee',
                border: '1px solid #ffcdd2',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                color: '#c62828',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            {!token ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#c62828' }}>Link inválido ou expirado.</p>
                <button
                  type="button"
                  onClick={() => setLocation('/auth')}
                  style={{
                    background: '#4A90D9', color: 'white', border: 'none',
                    borderRadius: '8px', padding: '12px 24px', fontSize: '15px',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#444', fontSize: '14px' }}>
                    Nova senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      style={{
                        width: '100%', padding: '12px 44px 12px 14px',
                        border: '1.5px solid #ddd', borderRadius: '8px',
                        fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: '#888', fontSize: '16px', padding: 0,
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#444', fontSize: '14px' }}>
                    Confirmar nova senha
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    style={{
                      width: '100%', padding: '12px 14px',
                      border: '1.5px solid #ddd', borderRadius: '8px',
                      fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#90caf9' : '#4A90D9',
                    color: 'white', border: 'none', borderRadius: '8px',
                    padding: '14px', fontSize: '16px', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>

                <button
                  type="button"
                  onClick={() => setLocation('/auth')}
                  style={{
                    width: '100%', background: 'none', color: '#888',
                    border: 'none', padding: '12px', fontSize: '14px',
                    cursor: 'pointer', marginTop: '8px',
                  }}
                >
                  Voltar ao login
                </button>
              </>
            )}
          </form>
        )}

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: '12px', marginTop: '24px', marginBottom: 0 }}>
          Nexo Soluções Digitais • App Rounder
        </p>
      </div>
    </div>
  );
}
