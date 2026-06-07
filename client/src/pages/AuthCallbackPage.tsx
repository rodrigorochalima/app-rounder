/**
 * Página de Callback de Autenticação (simplificada)
 * Redireciona para home após autenticação
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirecionar para home
    setLocation('/');
  }, [setLocation]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecionando...</p>
    </div>
  );
}
