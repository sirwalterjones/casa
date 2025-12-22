import { apiClient } from './apiClient';
import { ApiResponse } from '@/types';

// Super Admin Types
export interface Organization {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  contact_email?: string;
  phone?: string;
  address?: string;
  settings?: OrganizationSettings;
  created_at?: string;
  updated_at?: string;
  // Stats (from dashboard)
  cases_count?: number;
  volunteers_count?: number;
  users_count?: number;
}

export interface OrganizationSettings {
  allowVolunteerSelfRegistration?: boolean;
  requireBackgroundCheck?: boolean;
  maxCasesPerVolunteer?: number;
}

export interface SuperAdminDashboard {
  organizations: Organization[];
  totals: {
    organizations: number;
    cases: number;
    volunteers: number;
    users: number;
  };
  is_super_admin: boolean;
}

export interface OrganizationUser {
  id: number;
  user_id: number;
  organization_id: number;
  email: string;
  display_name: string;
  casa_role: string;
  status: string;
  created_at?: string;
}

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
}

export interface AssignUserData {
  user_id?: number;
  email?: string;
  organization_id: number;
  casa_role: 'admin' | 'supervisor' | 'volunteer';
}

class SuperAdminService {
  /**
   * Check if current user is super admin
   */
  async isSuperAdmin(): Promise<boolean> {
    try {
      const response = await apiClient.casaGet<any>('super-admin/dashboard');
      return response.success && response.data?.data?.is_super_admin === true;
    } catch {
      return false;
    }
  }

  /**
   * Get super admin dashboard with all organizations and stats
   */
  async getDashboard(): Promise<ApiResponse<SuperAdminDashboard>> {
    const response = await apiClient.casaGet<any>('super-admin/dashboard');

    if (response.success && response.data) {
      // Handle nested WordPress response
      const data = response.data.data || response.data;
      return {
        success: true,
        data: data as SuperAdminDashboard
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch dashboard'
    };
  }

  /**
   * Get all organizations
   */
  async getOrganizations(): Promise<ApiResponse<Organization[]>> {
    const response = await apiClient.casaGet<any>('super-admin/organizations');

    if (response.success && response.data) {
      const data = response.data.data || response.data;
      return {
        success: true,
        data: Array.isArray(data) ? data : []
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch organizations'
    };
  }

  /**
   * Create a new organization
   */
  async createOrganization(data: CreateOrganizationData): Promise<ApiResponse<Organization>> {
    const response = await apiClient.casaPost<any>('super-admin/organizations', data);

    if (response.success && response.data) {
      const orgData = response.data.data || response.data;
      return {
        success: true,
        data: orgData as Organization
      };
    }

    return {
      success: false,
      error: response.error || response.data?.message || 'Failed to create organization'
    };
  }

  /**
   * Update an organization
   */
  async updateOrganization(id: number, data: Partial<CreateOrganizationData>): Promise<ApiResponse<Organization>> {
    const response = await apiClient.casaPut<any>(`super-admin/organizations/${id}`, data);

    if (response.success && response.data) {
      const orgData = response.data.data || response.data;
      return {
        success: true,
        data: orgData as Organization
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to update organization'
    };
  }

  /**
   * Get users for an organization
   */
  async getOrganizationUsers(organizationId: number): Promise<ApiResponse<OrganizationUser[]>> {
    const response = await apiClient.casaGet<any>(`super-admin/organizations/${organizationId}/users`);

    if (response.success && response.data) {
      const data = response.data.data || response.data;
      return {
        success: true,
        data: Array.isArray(data) ? data : []
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to fetch users'
    };
  }

  /**
   * Assign user to organization
   */
  async assignUserToOrganization(data: AssignUserData): Promise<ApiResponse<any>> {
    const response = await apiClient.casaPost<any>('super-admin/assign-user', data);

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to assign user'
    };
  }

  /**
   * Switch organization context (for viewing as specific org)
   */
  async switchOrganization(organizationId: number): Promise<ApiResponse<Organization>> {
    const response = await apiClient.casaPost<any>(`super-admin/switch-org/${organizationId}`);

    if (response.success && response.data) {
      const orgData = response.data.data || response.data;
      return {
        success: true,
        data: orgData as Organization
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to switch organization'
    };
  }

  /**
   * Run full setup (creates super admin + test org)
   */
  async runFullSetup(): Promise<ApiResponse<any>> {
    const response = await apiClient.casaPost<any>('super-admin/full-setup');
    return response;
  }
}

export const superAdminService = new SuperAdminService();
export default superAdminService;
