/**
 * Serviço de Autenticação
 * Usa a API REST própria com Neon PostgreSQL (sem Supabase)
 */
import { authAPI, profileAPI, setTokens, clearTokens, getRefreshToken } from '@/lib/api';
import type {
  User,
  AuthSession,
  LoginCredentials,
  SignupData,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailConfirmation,
  LegalAcceptance
} from '@/types/auth.types';

/**
 * Faz login do usuário
 */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const { email, password, rememberMe } = credentials;
  const data = await authAPI.login(email, password);
  setTokens(data.accessToken, data.refreshToken, rememberMe !== false);
  return {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
  };
}

/**
 * Cadastra novo usuário
 */
export async function signup(signupData: SignupData): Promise<AuthSession> {
  const { email, password, fullName } = signupData;
  const data = await authAPI.signup(email, password, fullName);
  setTokens(data.accessToken, data.refreshToken, true);
  return {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
  };
}

/**
 * Faz logout do usuário
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  await authAPI.logout(refreshToken || undefined);
  clearTokens();
}

/**
 * Solicita reset de senha
 */
export async function requestPasswordReset(request: PasswordResetRequest): Promise<void> {
  await authAPI.resetPassword(request.email);
}

/**
 * Confirma reset de senha (placeholder)
 */
export async function confirmPasswordReset(_confirm: PasswordResetConfirm): Promise<void> {
  throw new Error('Redefinição via link não disponível nesta versão. Use a opção de alterar senha no perfil.');
}

/**
 * Confirma email (não necessário sem verificação de email)
 */
export async function confirmEmail(_confirmation: EmailConfirmation): Promise<void> {
  // Não necessário nesta versão
}

/**
 * Aceita termos legais (placeholder)
 */
export async function acceptLegalTerms(_acceptance: LegalAcceptance): Promise<void> {
  // Registrar localmente se necessário
}

/**
 * Obtém sessão atual
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) return null;
    const data = await authAPI.me();
    const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token') || '';
    return {
      user: data.user,
      accessToken: token,
      refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Atualiza dados do usuário
 */
export async function updateUserProfile(updates: Partial<User>): Promise<User> {
  const payload: any = {
    full_name: updates.fullName,
    phone: updates.phone,
    specialty: updates.specialty,
    crm: updates.crm,
    crm_state: updates.crmState,
    avatar_url: updates.avatarUrl,
    hospital_name: updates.hospitalName,
    hospital_phone: updates.hospitalPhone,
    position: updates.position,
    personal_phone: updates.personalPhone,
  };
  const data = await profileAPI.update(payload);
  return data.user;
}

/**
 * Atualiza senha do usuário
 */
export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  await authAPI.updatePassword(currentPassword, newPassword);
}

export const authService = {
  login,
  signup,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  confirmEmail,
  acceptLegalTerms,
  getCurrentSession,
  updateUserProfile,
  updatePassword,
};
