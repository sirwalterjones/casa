import { apiClient } from './apiClient';
import { Tenant, TenantSettings, User, ApiResponse, DashboardStats } from '@/types';

export class TenantService {
  // Get all tenants (admin only)
  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    try {
      const response = await apiClient.saasGet('tenants');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tenants',
      };
    }
  }

  // Get single tenant
  async getTenant(tenantId: string): Promise<ApiResponse<Tenant>> {
    try {
      const response = await apiClient.saasGet(`tenants/${tenantId}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tenant',
      };
    }
  }

  // Create new tenant
  async createTenant(tenantData: {
    name: string;
    slug: string;
    domain?: string;
    settings?: Partial<TenantSettings>;
  }): Promise<ApiResponse<Tenant>> {
    try {
      const response = await apiClient.saasPost('tenants', tenantData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create tenant',
      };
    }
  }

  // Update tenant
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    try {
      const response = await apiClient.saasPut(`tenants/${tenantId}`, updates);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update tenant',
      };
    }
  }

  // Delete tenant
  async deleteTenant(tenantId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.saasDelete(`tenants/${tenantId}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete tenant',
      };
    }
  }

  // Update tenant settings
  async updateTenantSettings(
    tenantId: string, 
    settings: Partial<TenantSettings>
  ): Promise<ApiResponse<TenantSettings>> {
    try {
      const response = await apiClient.saasPut(`tenants/${tenantId}/settings`, settings);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update tenant settings',
      };
    }
  }

  // Get tenant users
  async getTenantUsers(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: limit.toString(),
      });

      const response = await apiClient.saasGet(`tenants/${tenantId}/users?${params.toString()}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tenant users',
      };
    }
  }

  // Invite user to tenant
  async inviteUser(
    tenantId: string,
    userData: {
      email: string;
      role: string;
      displayName?: string;
    }
  ): Promise<ApiResponse<{ message: string; user: User }>> {
    try {
      const response = await apiClient.saasPost(`tenants/${tenantId}/invite`, userData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to invite user',
      };
    }
  }

  // Remove user from tenant
  async removeUser(tenantId: string, userId: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.saasDelete(`tenants/${tenantId}/users/${userId}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove user',
      };
    }
  }

  // Update user role in tenant
  async updateUserRole(
    tenantId: string,
    userId: number,
    role: string
  ): Promise<ApiResponse<{ message: string; user: User }>> {
    try {
      const response = await apiClient.saasPut(`tenants/${tenantId}/users/${userId}/role`, { role });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update user role',
      };
    }
  }

  // Get tenant dashboard statistics
  async getDashboardStats(tenantId: string): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await apiClient.saasGet(`tenants/${tenantId}/dashboard-stats`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      };
    }
  }

  // Get tenant analytics
  async getTenantAnalytics(
    tenantId: string,
    dateRange?: { start: string; end: string }
  ): Promise<ApiResponse<any>> {
    try {
      const params = dateRange 
        ? `?start_date=${dateRange.start}&end_date=${dateRange.end}`
        : '';
      
      const response = await apiClient.saasGet(`tenants/${tenantId}/analytics${params}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tenant analytics',
      };
    }
  }

  // Suspend tenant
  async suspendTenant(tenantId: string, reason?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.saasPost(`tenants/${tenantId}/suspend`, { reason });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to suspend tenant',
      };
    }
  }

  // Activate tenant
  async activateTenant(tenantId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.saasPost(`tenants/${tenantId}/activate`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to activate tenant',
      };
    }
  }

  // Check tenant slug availability
  async checkSlugAvailability(slug: string): Promise<ApiResponse<{ available: boolean }>> {
    try {
      const response = await apiClient.saasGet(`tenants/check-slug/${slug}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check slug availability',
      };
    }
  }

  // Get tenant by slug
  async getTenantBySlug(slug: string): Promise<ApiResponse<Tenant>> {
    try {
      const response = await apiClient.saasGet(`tenants/by-slug/${slug}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tenant by slug',
      };
    }
  }

  // Upload tenant logo
  async uploadLogo(
    tenantId: string,
    logoFile: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ logoUrl: string }>> {
    try {
      const response = await apiClient.uploadFile(
        `wp-json/saas/v1/tenants/${tenantId}/logo`,
        logoFile,
        'logo',
        onProgress
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to upload logo',
      };
    }
  }

  // Get tenant storage usage
  async getStorageUsage(tenantId: string): Promise<ApiResponse<{
    used: number;
    limit: number;
    files: number;
    breakdown: Record<string, number>;
  }>> {
    try {
      const response = await apiClient.saasGet(`tenants/${tenantId}/storage`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch storage usage',
      };
    }
  }

  // Export tenant data
  async exportTenantData(
    tenantId: string,
    options: {
      includeUsers?: boolean;
      includeForms?: boolean;
      includeSubmissions?: boolean;
      dateRange?: { start: string; end: string };
    }
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    try {
      const response = await apiClient.saasPost(`tenants/${tenantId}/export`, options);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to export tenant data',
      };
    }
  }

  // Validate tenant slug format
  validateSlug(slug: string): { valid: boolean; error?: string } {
    // Check length
    if (slug.length < 3) {
      return { valid: false, error: 'Slug must be at least 3 characters long' };
    }

    if (slug.length > 50) {
      return { valid: false, error: 'Slug must be less than 50 characters long' };
    }

    // Check format (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }

    // Check that it doesn't start or end with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { valid: false, error: 'Slug cannot start or end with a hyphen' };
    }

    // Check for reserved words
    const reservedWords = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'app', 'dashboard'];
    if (reservedWords.includes(slug.toLowerCase())) {
      return { valid: false, error: 'This slug is reserved and cannot be used' };
    }

    return { valid: true };
  }

  // Generate tenant domain
  generateDomain(slug: string, baseDomain: string = 'yourapp.com'): string {
    return `${slug}.${baseDomain}`;
  }

  // Parse tenant from subdomain
  parseTenantFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Extract subdomain
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        return parts[0];
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // Get default tenant settings
  getDefaultSettings(): TenantSettings {
    return {
      branding: {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
      },
      features: {
        maxForms: 10,
        maxUsers: 5,
        fileUploadEnabled: true,
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
      },
      notifications: {
        emailNotifications: true,
      },
    };
  }
}

// Export singleton instance
export const tenantService = new TenantService();
export default tenantService;