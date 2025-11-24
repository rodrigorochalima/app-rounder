/**
 * Serviço de Instituições
 * Gerencia instituições e membros
 */

import { supabase } from '@/lib/supabase';
import type {
  Institution,
  InstitutionMember,
  InstitutionWithMembership,
  CreateInstitutionData,
  UpdateInstitutionData,
  InviteMemberData
} from '@/types/institution.types';
import { createAuditLog } from '../audit/audit.service';

/**
 * Busca todas as instituições do usuário atual
 */
export async function getUserInstitutions(): Promise<InstitutionWithMembership[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('institution_members')
    .select(`
      *,
      institution:institutions(*)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Erro ao buscar instituições: ${error.message}`);
  }

  return (data || []).map(item => ({
    ...item.institution,
    membership: {
      id: item.id,
      institutionId: item.institution_id,
      userId: item.user_id,
      role: item.role,
      canManageMembers: item.can_manage_members,
      canManageApiKeys: item.can_manage_api_keys,
      canExportData: item.can_export_data,
      canViewAnalytics: item.can_view_analytics,
      isActive: item.is_active,
      invitedBy: item.invited_by,
      invitedAt: item.invited_at,
      joinedAt: item.joined_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }
  }));
}

/**
 * Busca uma instituição específica
 */
export async function getInstitution(institutionId: string): Promise<Institution> {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', institutionId)
    .single();

  if (error || !data) {
    throw new Error(`Erro ao buscar instituição: ${error?.message}`);
  }

  return mapSupabaseToInstitution(data);
}

/**
 * Cria nova instituição
 */
export async function createInstitution(institutionData: CreateInstitutionData): Promise<Institution> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Gerar slug único
  const slug = generateSlug(institutionData.name);

  const { data, error } = await supabase
    .from('institutions')
    .insert({
      name: institutionData.name,
      slug,
      description: institutionData.description,
      cnpj: institutionData.cnpj,
      phone: institutionData.phone,
      email: institutionData.email,
      owner_id: user.id
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar instituição: ${error?.message}`);
  }

  // Adicionar usuário como owner
  await supabase.from('institution_members').insert({
    institution_id: data.id,
    user_id: user.id,
    role: 'owner',
    can_manage_members: true,
    can_manage_api_keys: true,
    can_export_data: true,
    can_view_analytics: true,
    joined_at: new Date().toISOString()
  });

  await createAuditLog({
    userId: user.id,
    institutionId: data.id,
    action: 'institution_created',
    resourceType: 'institution',
    resourceId: data.id,
    details: institutionData
  });

  return mapSupabaseToInstitution(data);
}

/**
 * Atualiza instituição
 */
export async function updateInstitution(
  institutionId: string,
  updates: UpdateInstitutionData
): Promise<Institution> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Verificar permissão
  await checkPermission(institutionId, user.id, 'can_manage_members');

  const { data, error } = await supabase
    .from('institutions')
    .update({
      name: updates.name,
      description: updates.description,
      cnpj: updates.cnpj,
      phone: updates.phone,
      email: updates.email,
      logo_url: updates.logoUrl,
      primary_color: updates.primaryColor,
      secondary_color: updates.secondaryColor
    })
    .eq('id', institutionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao atualizar instituição: ${error?.message}`);
  }

  await createAuditLog({
    userId: user.id,
    institutionId,
    action: 'institution_updated',
    resourceType: 'institution',
    resourceId: institutionId,
    details: updates
  });

  return mapSupabaseToInstitution(data);
}

/**
 * Busca membros de uma instituição
 */
export async function getInstitutionMembers(institutionId: string): Promise<InstitutionMember[]> {
  const { data, error } = await supabase
    .from('institution_members')
    .select(`
      *,
      user:users(id, email, full_name, avatar_url, specialty)
    `)
    .eq('institution_id', institutionId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Erro ao buscar membros: ${error.message}`);
  }

  return (data || []).map(mapSupabaseToMember);
}

/**
 * Convida membro para instituição
 */
export async function inviteMember(
  institutionId: string,
  inviteData: InviteMemberData
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Verificar permissão
  await checkPermission(institutionId, user.id, 'can_manage_members');

  // Buscar usuário pelo email
  const { data: invitedUser } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('email', inviteData.email)
    .single();

  if (!invitedUser) {
    throw new Error('Usuário não encontrado. Ele precisa criar uma conta primeiro.');
  }

  // Verificar se já é membro
  const { data: existing } = await supabase
    .from('institution_members')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('user_id', invitedUser.user_id)
    .single();

  if (existing) {
    throw new Error('Usuário já é membro desta instituição');
  }

  // Criar convite
  const { error } = await supabase.from('institution_members').insert({
    institution_id: institutionId,
    user_id: invitedUser.id,
    role: inviteData.role,
    can_manage_members: inviteData.canManageMembers || false,
    can_manage_api_keys: inviteData.canManageApiKeys || false,
    can_export_data: inviteData.canExportData || false,
    invited_by: user.id
  });

  if (error) {
    throw new Error(`Erro ao convidar membro: ${error.message}`);
  }

  await createAuditLog({
    userId: user.id,
    institutionId,
    action: 'member_invited',
    resourceType: 'institution_member',
    details: { email: inviteData.email, role: inviteData.role }
  });

  // TODO: Enviar email de convite
}

/**
 * Remove membro da instituição
 */
export async function removeMember(institutionId: string, memberId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Verificar permissão
  await checkPermission(institutionId, user.id, 'can_manage_members');

  const { error } = await supabase
    .from('institution_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('institution_id', institutionId);

  if (error) {
    throw new Error(`Erro ao remover membro: ${error.message}`);
  }

  await createAuditLog({
    userId: user.id,
    institutionId,
    action: 'member_removed',
    resourceType: 'institution_member',
    resourceId: memberId
  });
}

/**
 * Verifica permissão do usuário na instituição
 */
async function checkPermission(
  institutionId: string,
  userId: string,
  permission: keyof Pick<InstitutionMember, 'canManageMembers' | 'canManageApiKeys' | 'canExportData'>
): Promise<void> {
  const { data } = await supabase
    .from('institution_members')
    .select('role, can_manage_members, can_manage_api_keys, can_export_data')
    .eq('institution_id', institutionId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!data) {
    throw new Error('Você não tem acesso a esta instituição');
  }

  if (data.role !== 'owner' && !data[permission]) {
    throw new Error('Você não tem permissão para esta ação');
  }
}

/**
 * Gera slug único para instituição
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Math.random().toString(36).substring(2, 7);
}

/**
 * Mapeia dados do Supabase para Institution
 */
function mapSupabaseToInstitution(data: any): Institution {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    logoUrl: data.logo_url,
    cnpj: data.cnpj,
    address: data.address,
    city: data.city,
    state: data.state,
    country: data.country,
    phone: data.phone,
    email: data.email,
    website: data.website,
    timezone: data.timezone,
    language: data.language,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    powerBiEnabled: data.power_bi_enabled,
    knowledgeExportEnabled: data.knowledge_export_enabled,
    advancedAnalyticsEnabled: data.advanced_analytics_enabled,
    maxUsers: data.max_users,
    maxRoundsPerMonth: data.max_rounds_per_month,
    storageLimitMb: data.storage_limit_mb,
    isActive: data.is_active,
    subscriptionTier: data.subscription_tier,
    subscriptionExpiresAt: data.subscription_expires_at,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Mapeia dados do Supabase para InstitutionMember
 */
function mapSupabaseToMember(data: any): InstitutionMember {
  return {
    id: data.id,
    institutionId: data.institution_id,
    userId: data.user_id,
    role: data.role,
    canManageMembers: data.can_manage_members,
    canManageApiKeys: data.can_manage_api_keys,
    canExportData: data.can_export_data,
    canViewAnalytics: data.can_view_analytics,
    isActive: data.is_active,
    invitedBy: data.invited_by,
    invitedAt: data.invited_at,
    joinedAt: data.joined_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
