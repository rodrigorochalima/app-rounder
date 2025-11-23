/**
 * Tipos relacionados a instituições e membros
 */

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // Configurações
  timezone: string;
  language: string;
  
  // Branding
  primaryColor: string;
  secondaryColor: string;
  
  // Features
  powerBiEnabled: boolean;
  knowledgeExportEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  
  // Limites
  maxUsers: number;
  maxRoundsPerMonth: number;
  storageLimitMb: number;
  
  // Status
  isActive: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: string;
  
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionMember {
  id: string;
  institutionId: string;
  userId: string;
  role: MemberRole;
  
  // Permissões
  canManageMembers: boolean;
  canManageApiKeys: boolean;
  canExportData: boolean;
  canViewAnalytics: boolean;
  
  isActive: boolean;
  invitedBy?: string;
  invitedAt: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionWithMembership extends Institution {
  membership: InstitutionMember;
}

export interface CreateInstitutionData {
  name: string;
  description?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
}

export interface UpdateInstitutionData extends Partial<CreateInstitutionData> {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface InviteMemberData {
  email: string;
  role: MemberRole;
  canManageMembers?: boolean;
  canManageApiKeys?: boolean;
  canExportData?: boolean;
}
