/**
 * Página de Autenticação (Login/Cadastro)
 * Design mobile-first com paleta de cores do ícone Rounder
 */

import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, FileText } from 'lucide-react';
import { login, signup, requestPasswordReset } from '@/services/auth/auth.service';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { setSession } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [crm, setCrm] = useState('');
  const [crmState, setCrmState] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const session = await login({ email, password, rememberMe });
        setSession(session);
        setLocation('/');
      } else if (mode === 'signup') {
        const session = await signup({
          email,
          password,
          fullName,
          phone,
          specialty,
          crm,
          crmState
        });
        setSession(session);
        setLocation('/');
      } else if (mode === 'reset') {
        await requestPasswordReset({ email });
        setResetEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A8D8EA] via-[#87CEEB] to-[#5B9BD5] flex items-center justify-center p-4">
      {/* Container principal - mobile first */}
      <div className="w-full max-w-md">
        {/* Logo e título - ÍCONE EM DESTAQUE */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl mb-6 p-2">
            <img 
              src="/rounder-icon.png" 
              alt="App Rounder" 
              className="w-full h-full rounded-[2rem] object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Rounder
          </h1>
          <p className="text-white/90 text-lg drop-shadow">
            Gerador Inteligente de Rounds Médicos
          </p>
        </div>

        {/* Card de autenticação */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Tabs Login/Cadastro */}
          {mode !== 'reset' ? (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-[#5B9BD5] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-[#4A90E2] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Criar Conta
            </button>
          </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">Recuperar Senha</h2>
              <p className="text-sm text-gray-600">Digite seu email para receber o link de recuperação</p>
            </div>
          )}

          {/* Mensagem de sucesso (reset) */}
          {resetEmailSent && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm">
              ✅ Email enviado! Verifique sua caixa de entrada e spam.
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B9BD5]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Campos extras para cadastro */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B9BD5]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                      placeholder="Dr. João Silva"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                      CRM
                    </label>
                    <input
                      type="text"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                      placeholder="123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                      UF
                    </label>
                    <input
                      type="text"
                      value={crmState}
                      onChange={(e) => setCrmState(e.target.value.toUpperCase())}
                      maxLength={2}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                      placeholder="SP"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                    Especialidade (opcional)
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                    placeholder="Cardiologia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                    Telefone (opcional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B9BD5]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Senha (não mostrar em reset) */}
            {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-semibold text-[#2C3E50] mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B9BD5]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5B9BD5] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            )}

            {/* Lembrar-me (apenas login) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#5B9BD5] border-gray-300 rounded focus:ring-[#5B9BD5]"
                  />
                  <span className="text-sm text-[#2C3E50] font-medium">Lembrar-me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-sm text-[#5B9BD5] hover:text-[#4A90E2] font-semibold"
                >
                  Esqueci a senha
                </button>
              </div>
            )}

            {/* Termos (apenas cadastro) */}
            {mode === 'signup' && (
              <div className="text-xs text-gray-600 bg-[#A8D8EA]/20 p-4 rounded-2xl border border-[#A8D8EA]">
                Ao criar uma conta, você concorda com nossos{' '}
                <button type="button" className="text-[#5B9BD5] hover:underline font-semibold">
                  Termos de Uso
                </button>{' '}
                e{' '}
                <button type="button" className="text-[#5B9BD5] hover:underline font-semibold">
                  Política de Privacidade
                </button>
              </div>
            )}

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${
                mode === 'login'
                  ? 'bg-[#5B9BD5] hover:bg-[#4A90E2] active:scale-95'
                  : 'bg-[#4A90E2] hover:bg-[#5B9BD5] active:scale-95'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </span>
              ) : mode === 'login' ? (
                'Entrar'
              ) : mode === 'signup' ? (
                'Criar Conta'
              ) : (
                'Enviar Link de Recuperação'
              )}
            </button>

            {/* Botão de voltar (apenas reset) */}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetEmailSent(false);
                  setError('');
                }}
                className="w-full mt-3 py-3 rounded-2xl font-semibold text-[#5B9BD5] bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Voltar ao Login
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white drop-shadow">
          <p className="text-sm font-medium opacity-90">
            Nexo Soluções Digitais
          </p>
          <p className="text-xs opacity-75">
            App Rounder • Gerador Inteligente de Rounds Médicos
          </p>
        </div>
      </div>
    </div>
  );
}
