/**
 * Serviço de Autenticação
 * Gerencia login, cadastro, logout e sessão
 */

import { supabase } from '@/lib/supabase';
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
import { createAuditLog } from '../audit/audit.service';

/**
 * Faz login do usuário
 */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const { email, password, rememberMe } = credentials;

  // Login no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    throw new Error(`Erro ao fazer login: ${authError.message}`);
  }

  if (!authData.user || !authData.session) {
    throw new Error('Erro ao obter dados do usuário');
  }

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData) {
    throw new Error('Erro ao buscar dados do usuário');
  }

  // Atualizar último login
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', authData.user.id);

  // Criar log de auditoria
  await createAuditLog({
    userId: authData.user.id,
    action: 'login',
    resourceType: 'user',
    resourceId: authData.user.id,
    details: { rememberMe }
  });

  // Mapear para tipo User
  const user: User = mapSupabaseUserToUser(userData);

  return {
    user,
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
    expiresAt: authData.session.expires_at || 0
  };
}

/**
 * Cadastra novo usuário
 */
export async function signup(data: SignupData): Promise<AuthSession> {
  const { email, password, fullName, phone, specialty, crm, crmState } = data;

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${window.location.origin}/auth/confirm`
    }
  });

  if (authError) {
    throw new Error(`Erro ao criar conta: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Erro ao criar usuário');
  }

  // Criar registro na tabela users
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      phone,
      specialty,
      crm,
      crm_state: crmState,
      email_confirmed: false,
      terms_accepted: false,
      privacy_accepted: false,
      data_collection_consent: false
    });

  if (userError) {
    // Se falhar ao criar user, deletar do auth
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Erro ao criar perfil: ${userError.message}`);
  }

  // Buscar dados completos
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (!userData) {
    throw new Error('Erro ao buscar dados do usuário');
  }

  // Criar log de auditoria
  await createAuditLog({
    userId: authData.user.id,
    action: 'signup',
    resourceType: 'user',
    resourceId: authData.user.id,
    details: { email, fullName }
  });

  const user: User = mapSupabaseUserToUser(userData);

  // Se não retornou session, usuário precisa confirmar email
  if (!authData.session) {
    throw new Error('Conta criada! Verifique seu email para confirmar.');
  }

  return {
    user,
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
    expiresAt: authData.session.expires_at || 0
  };
}

/**
 * Faz logout do usuário
 */
export async function logout(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await createAuditLog({
      userId: user.id,
      action: 'logout',
      resourceType: 'user',
      resourceId: user.id
    });
  }

  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Erro ao fazer logout: ${error.message}`);
  }
}

/**
 * Solicita reset de senha
 */
export async function requestPasswordReset(request: PasswordResetRequest): Promise<void> {
  const { email } = request;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });

  if (error) {
    throw new Error(`Erro ao solicitar reset de senha: ${error.message}`);
  }
}

/**
 * Confirma reset de senha
 */
export async function confirmPasswordReset(confirm: PasswordResetConfirm): Promise<void> {
  const { token, newPassword } = confirm;

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw new Error(`Erro ao redefinir senha: ${error.message}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await createAuditLog({
      userId: user.id,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: user.id
    });
  }
}

/**
 * Confirma email do usuário
 */
export async function confirmEmail(confirmation: EmailConfirmation): Promise<void> {
  const { token } = confirmation;

  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'email'
  });

  if (error) {
    throw new Error(`Erro ao confirmar email: ${error.message}`);
  }

  // Atualizar flag de email confirmado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase
      .from('users')
      .update({ email_confirmed: true })
      .eq('id', user.id);

    await createAuditLog({
      userId: user.id,
      action: 'email_confirmed',
      resourceType: 'user',
      resourceId: user.id
    });
  }
}

/**
 * Aceita termos legais
 */
export async function acceptLegalTerms(acceptance: LegalAcceptance): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const now = new Date().toISOString();

  const updates: any = {};
  
  if (acceptance.termsAccepted) {
    updates.terms_accepted = true;
    updates.terms_accepted_at = now;
  }
  
  if (acceptance.privacyAccepted) {
    updates.privacy_accepted = true;
    updates.privacy_accepted_at = now;
  }
  
  if (acceptance.dataCollectionConsent) {
    updates.data_collection_consent = true;
    updates.data_collection_consent_at = now;
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    throw new Error(`Erro ao aceitar termos: ${error.message}`);
  }

  // Registrar aceitação nos logs
  await createAuditLog({
    userId: user.id,
    action: 'legal_terms_accepted',
    resourceType: 'user',
    resourceId: user.id,
    details: acceptance
  });
}

/**
 * Obtém sessão atual
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!userData) {
    return null;
  }

  return {
    user: mapSupabaseUserToUser(userData),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || 0
  };
}

/**
 * Atualiza dados do usuário
 */
export async function updateUserProfile(updates: Partial<User>): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: updates.fullName,
      phone: updates.phone,
      specialty: updates.specialty,
      crm: updates.crm,
      crm_state: updates.crmState,
      avatar_url: updates.avatarUrl
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao atualizar perfil: ${error?.message}`);
  }

  await createAuditLog({
    userId: user.id,
    action: 'profile_updated',
    resourceType: 'user',
    resourceId: user.id,
    details: updates
  });

  return mapSupabaseUserToUser(data);
}

/**
 * Mapeia dados do Supabase para tipo User
 */
function mapSupabaseUserToUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    phone: data.phone,
    specialty: data.specialty,
    crm: data.crm,
    crmState: data.crm_state,
    isActive: data.is_active,
    emailConfirmed: data.email_confirmed,
    termsAccepted: data.terms_accepted,
    termsAcceptedAt: data.terms_accepted_at,
    privacyAccepted: data.privacy_accepted,
    privacyAcceptedAt: data.privacy_accepted_at,
    dataCollectionConsent: data.data_collection_consent,
    dataCollectionConsentAt: data.data_collection_consent_at,
    lastLoginAt: data.last_login_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
