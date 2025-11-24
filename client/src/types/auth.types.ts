/**
 * Tipos relacionados à autenticação e usuários
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  specialty?: string;
  crm?: string;
  crmState?: string;
  role: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  specialty?: string;
  crm?: string;
  crmState?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface EmailConfirmation {
  token: string;
}

export interface LegalAcceptance {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataCollectionConsent: boolean;
}
