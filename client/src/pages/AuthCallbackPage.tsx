/**
 * Página de Callback de Autenticação
 * Processa confirmação de email e redirecionamentos
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando...');

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      // Pegar hash da URL (contém o token)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (!accessToken) {
        throw new Error('Token não encontrado');
      }

      // Confirmar email
      if (type === 'signup' || type === 'email') {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) throw error;

        if (data.session) {
          setSession({
            user: {
              id: data.session.user.id,
              email: data.session.user.email!,
              fullName: data.session.user.user_metadata.full_name || '',
              phone: data.session.user.user_metadata.phone,
              specialty: data.session.user.user_metadata.specialty,
              crm: data.session.user.user_metadata.crm,
              crmState: data.session.user.user_metadata.crm_state,
              createdAt: data.session.user.created_at
            },
            token: data.session.access_token,
            expiresAt: new Date(data.session.expires_at! * 1000).toISOString()
          });

          setStatus('success');
          setMessage('Email confirmado com sucesso! Redirecionando...');

          // Redirecionar após 2 segundos
          setTimeout(() => {
            setLocation('/');
          }, 2000);
        }
      }
      // Recuperação de senha
      else if (type === 'recovery') {
        setStatus('success');
        setMessage('Redirecionando para redefinir senha...');
        setTimeout(() => {
          setLocation('/auth/reset-password');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erro no callback:', error);
      setStatus('error');
      setMessage(error.message || 'Erro ao processar confirmação');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A8D8EA] via-[#87CEEB] to-[#5B9BD5] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-xl mb-6">
          <img 
            src="/rounder-icon.png" 
            alt="App Rounder" 
            className="w-full h-full rounded-2xl object-cover"
          />
        </div>

        {/* Status */}
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-[#5B9BD5] border-t-transparent rounded-full animate-spin" />
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">
              Processando...
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto confirmamos seu email
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">
              Sucesso! ✅
            </h2>
            <p className="text-gray-600">
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">
              Erro ❌
            </h2>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <button
              onClick={() => setLocation('/auth')}
              className="px-6 py-3 bg-[#5B9BD5] hover:bg-[#4A90E2] text-white rounded-2xl font-bold transition-colors"
            >
              Voltar para Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
