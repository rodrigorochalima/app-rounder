/**
 * Página de Reset de Senha (simplificada)
 * Redireciona para login
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function ResetPassword() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/auth');
  }, [setLocation]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecionando para login...</p>
    </div>
  );
}
