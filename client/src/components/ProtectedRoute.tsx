/**
 * Componente de Rota Protegida
 * Redireciona para /auth se usuário não estiver autenticado
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Aguarda carregar sessão
    if (loading) return;

    // Se não tem sessão, redireciona para login
    if (!session) {
      console.log('🔒 Usuário não autenticado, redirecionando para /auth');
      setLocation('/auth');
    }
  }, [session, loading, setLocation]);

  // Enquanto carrega, mostra loading
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px',
        fontWeight: 600
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Carregando...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Se não tem sessão, não renderiza nada (já redirecionou)
  if (!session) {
    return null;
  }

  // Se tem sessão, renderiza o conteúdo
  return <>{children}</>;
}

export default ProtectedRoute;
