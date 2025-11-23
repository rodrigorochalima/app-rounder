/**
 * Context de Autenticação
 * Gerencia estado global do usuário autenticado
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, AuthSession } from '@/types/auth.types';
import { getCurrentSession } from '@/services/auth/auth.service';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  setSession: (session: AuthSession | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar sessão ao iniciar
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const currentSession = await getCurrentSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        session,
        loading,
        setSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
