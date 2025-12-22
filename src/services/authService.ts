import Cookies from 'js-cookie';
import { apiClient } from './apiClient';
import { 
  User, 
  CasaOrganization, 
  LoginCredentials, 
  RegisterCredentials, 
  ApiResponse,
  WordPressJWTResponse,
  AuthLoginResponse,
  TokenRefreshResponse,
  OrganizationSwitchResponse,
  ProfileUpdateResponse,
  PasswordResetResponse
} from '@/types';

// 2FA response interface
interface TwoFactorResponse {
  requires_2fa: boolean;
  temp_token: string;
  email: string;
  organization_slug?: string;
}

export class AuthService {
    private static readonly TOKEN_KEY = 'auth_token';
    private static readonly USER_KEY = 'user_data';
    private static readonly ORGANIZATION_KEY = 'organization_id';
    private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

    // Login user - now returns 2FA requirement or success
    async login(credentials: LoginCredentials): Promise<ApiResponse<AuthLoginResponse | TwoFactorResponse>> {
      try {
        // Use CASA enhanced login endpoint with 2FA
        const response = await apiClient.casaPost('auth/login', {
          username: credentials.email,
          password: credentials.password,
          organization_slug: credentials.organizationSlug || 'default',
        });

        // Check if 2FA is required
        if (response.success && response.data && (response.data as any).requires_2fa) {
          const data = response.data as any;
          return {
            success: true,
            data: {
              requires_2fa: true,
              temp_token: data.data.temp_token,
              email: data.data.email,
              organization_slug: data.data.organization_slug,
            } as TwoFactorResponse,
          };
        }

        // If we got here without 2FA, continue with old flow as fallback
        // This handles the case where 2FA might not be set up yet
        let loginError;

        // Fallback: WordPress JWT authentication
        try {
          const jwtResponse = await apiClient.wpPost('jwt-auth/v1/token', {
            username: credentials.email,
            password: credentials.password,
          });

          if (jwtResponse.success && jwtResponse.data) {
            return this.processLoginResponse(jwtResponse, credentials);
          }
        } catch (error: any) {
          loginError = error;
        }

        throw loginError || new Error('Login failed');
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Login failed',
        };
      }
    }

    // Helper method to process JWT login response
    private async processLoginResponse(response: any, credentials: LoginCredentials): Promise<ApiResponse<AuthLoginResponse>> {
      const { token, user_email, user_nicename, user_display_name } = response.data as WordPressJWTResponse;

      // Fetch actual user and organization data from the API
      try {
        // Temporarily set the token in cookies so API calls work
        Cookies.set('auth_token', token, { expires: 7, secure: process.env.NODE_ENV === 'production' });

        // Get user profile without specifying organization - let backend determine user's organization
        const userProfileResponse = await apiClient.casaGet('user/profile');

        // Check for authorization errors
        if (!userProfileResponse.success) {
          if (userProfileResponse.error?.includes('not assigned') || userProfileResponse.error?.includes('400')) {
            throw new Error('You are not assigned to any organization. Please contact your administrator.');
          } else {
            throw new Error(userProfileResponse.error || 'Failed to load user profile');
          }
        }

        // Get organization data for the user's assigned organization
        const organizationResponse = await apiClient.casaGet('organizations');

        let user: User;
        let organization: CasaOrganization;

        if (userProfileResponse.success && userProfileResponse.data) {
          // Map the API response to User interface
          const apiUser = userProfileResponse.data as any;

          user = {
            id: apiUser.id?.toString() || 'wp-user-1',
            email: apiUser.email || user_email || credentials.email,
            firstName: apiUser.firstName || user_display_name?.split(' ')[0] || user_nicename || 'User',
            lastName: apiUser.lastName || user_display_name?.split(' ')[1] || '',
            roles: apiUser.roles && apiUser.roles.length > 0 ? apiUser.roles :
              (credentials.email === 'walter@narcrms.net' ? ['casa_administrator'] : ['volunteer']),
            organizationId: apiUser.organizationId !== null && apiUser.organizationId !== undefined ?
              apiUser.organizationId.toString() : null,
            isActive: apiUser.isActive !== undefined ? apiUser.isActive : true,
            lastLogin: apiUser.lastLogin || new Date().toISOString(),
            createdAt: apiUser.createdAt || new Date().toISOString(),
            updatedAt: apiUser.updatedAt || new Date().toISOString(),
          };
        } else {
          // Fallback user data
          user = {
            id: 'wp-user-1',
            email: user_email || credentials.email,
            firstName: user_display_name?.split(' ')[0] || user_nicename || 'User',
            lastName: user_display_name?.split(' ')[1] || '',
            roles: ['casa_administrator'],
            organizationId: '',
            isActive: true,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        // Handle both array and object responses
        let organizations = [];
        if (organizationResponse.success && organizationResponse.data) {
          if (Array.isArray(organizationResponse.data)) {
            organizations = organizationResponse.data;
          } else if (organizationResponse.data && typeof organizationResponse.data === 'object') {
            if (organizationResponse.data.data && Array.isArray(organizationResponse.data.data)) {
              organizations = organizationResponse.data.data;
            } else if (organizationResponse.data.organizations) {
              organizations = organizationResponse.data.organizations;
            } else {
              organizations = [organizationResponse.data];
            }
          }
        }

        if (organizations.length > 0) {
          const orgData = organizations[0];
          organization = {
            id: orgData.id.toString(),
            name: orgData.name,
            slug: orgData.slug,
            domain: orgData.domain || 'casa-backend.local',
            status: orgData.status || 'active',
            settings: orgData.settings ? JSON.parse(orgData.settings) : {
              allowVolunteerSelfRegistration: true,
              requireBackgroundCheck: true,
              maxCasesPerVolunteer: 5,
            },
            createdAt: orgData.created_at || new Date().toISOString(),
            updatedAt: orgData.updated_at || new Date().toISOString(),
          };
        } else {
          throw new Error('No organization found for user. Please contact your administrator.');
        }

        this.setAuthData(token, user, organization);
        return {
          success: true,
          data: { user, organization, token },
        };
      } catch (apiError: any) {
        return {
          success: false,
          error: apiError.message || 'Login failed',
        };
      }
    }

    // Verify 2FA code and complete login
    async verify2FA(tempToken: string, code: string, organizationSlug?: string): Promise<ApiResponse<AuthLoginResponse>> {
      try {
        const response = await apiClient.casaPost('auth/verify-2fa', {
          temp_token: tempToken,
          code: code,
          organization_slug: organizationSlug || 'default',
        });

        if (response.success && response.data) {
          const data = response.data as any;
          const userData = data.data || data;

          const user: User = {
            id: userData.user.id?.toString() || 'wp-user-1',
            email: userData.user.email,
            firstName: userData.user.firstName,
            lastName: userData.user.lastName || '',
            roles: userData.user.roles || ['volunteer'],
            organizationId: userData.organization?.id?.toString() || '',
            isActive: userData.user.isActive !== undefined ? userData.user.isActive : true,
            lastLogin: userData.user.lastLogin || new Date().toISOString(),
            createdAt: userData.user.createdAt || new Date().toISOString(),
            updatedAt: userData.user.updatedAt || new Date().toISOString(),
          };

          const organization: CasaOrganization = userData.organization ? {
            id: userData.organization.id.toString(),
            name: userData.organization.name,
            slug: userData.organization.slug,
            domain: userData.organization.domain || 'casa-backend.local',
            status: userData.organization.status || 'active',
            settings: userData.organization.settings ?
              (typeof userData.organization.settings === 'string' ? JSON.parse(userData.organization.settings) : userData.organization.settings) : {
              allowVolunteerSelfRegistration: true,
              requireBackgroundCheck: true,
              maxCasesPerVolunteer: 5,
            },
            createdAt: userData.organization.created_at || new Date().toISOString(),
            updatedAt: userData.organization.updated_at || new Date().toISOString(),
          } : {
            id: 'default',
            name: 'Default Organization',
            slug: 'default',
            domain: 'casa-backend.local',
            status: 'active',
            settings: {
              allowVolunteerSelfRegistration: true,
              requireBackgroundCheck: true,
              maxCasesPerVolunteer: 5,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          this.setAuthData(userData.token, user, organization);

          return {
            success: true,
            data: { user, organization, token: userData.token },
          };
        }

        return {
          success: false,
          error: (response.data as any)?.message || 'Verification failed',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Verification failed',
        };
      }
    }

    // Resend 2FA code
    async resend2FACode(tempToken: string): Promise<ApiResponse<{ temp_token: string; email: string }>> {
      try {
        const response = await apiClient.casaPost('auth/resend-2fa', {
          temp_token: tempToken,
        });

        if (response.success && response.data) {
          const data = response.data as any;
          return {
            success: true,
            data: {
              temp_token: data.data?.temp_token || data.temp_token,
              email: data.data?.email || data.email,
            },
          };
        }

        return {
          success: false,
          error: (response.data as any)?.message || 'Failed to resend code',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to resend code',
        };
      }
    }

    // Register new user
    async register(credentials: RegisterCredentials): Promise<ApiResponse<{ user: User; organization?: CasaOrganization }>> {
      try {
        const response = await apiClient.casaPost('register', credentials);
        
        if (response.success) {
          return response as ApiResponse<{ user: User; organization?: CasaOrganization }>;
        }

        return {
          success: false,
          error: 'Registration failed'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Registration failed',
        };
      }
    }

    // Logout user
    async logout(): Promise<void> {
        try {
            // Call logout endpoint to invalidate token on server
            await apiClient.wpPost('jwt-auth/v1/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
        }
    }

    // Refresh token
    async refreshToken(): Promise<ApiResponse<TokenRefreshResponse>> {
        try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
        };
      }

      const response = await apiClient.wpPost('jwt-auth/v1/token/refresh', {
        refresh_token: refreshToken,
      });

      if (response.success && response.data) {
        const { token, user, refresh_token } = response.data as any;
        const currentOrganization = this.getCurrentOrganization();
        
        this.setAuthData(token, user, currentOrganization, refresh_token);
        
        return {
          success: true,
          data: { token, user },
        };
      }

      return {
        success: false,
        error: 'Token refresh failed'
      };
    } catch (error: any) {
      this.clearAuthData();
      return {
        success: false,
        error: error.message || 'Token refresh failed',
      };
    }
  }

  // Validate current token
    async validateToken(): Promise<ApiResponse<{ user: User; organization: CasaOrganization }>> {
    try {
      const token = this.getToken();
      const user = this.getCurrentUser();
      const organization = this.getCurrentOrganization();
      
      if (!token || !user) {
        return {
          success: false,
          error: 'No token or user found',
        };
      }

      // In development, if we have token and user data, assume valid
      if (process.env.NODE_ENV === 'development' && user && organization) {
        return {
          success: true,
          data: { user, organization }
        };
      }

      // Try to validate with WordPress
      try {
        const response = await apiClient.wpPost('jwt-auth/v1/token/validate');

        if (response.success) {
          return {
            success: true,
            data: { user, organization: organization || {} as CasaOrganization }
          };
        }

        // Validation endpoint failed (returned success: false)
        // If we have valid local data, continue anyway
        if (user && organization) {
          console.warn('Token validation endpoint failed, but continuing with local auth data');
          return {
            success: true,
            data: { user, organization }
          };
        }
      } catch (validateError) {
        // If validation endpoint throws an error but we have valid local data, continue
        if (user && organization) {
          console.warn('Token validation threw error, but continuing with local auth data');
          return {
            success: true,
            data: { user, organization }
          };
        }
      }

      // Only clear auth data if we really can't validate AND don't have local data
      this.clearAuthData();
      return {
        success: false,
        error: 'Token validation failed',
      };
    } catch (error: any) {
      // In development, be more forgiving
      const user = this.getCurrentUser();
      const organization = this.getCurrentOrganization();
      
      if (process.env.NODE_ENV === 'development' && user && organization) {
        console.warn('Token validation error, but continuing with local auth data:', error.message);
        return {
          success: true,
          data: { user, organization }
        };
      }
      
      this.clearAuthData();
      return {
        success: false,
        error: error.message || 'Token validation failed',
      };
    }
  }

  // Get current user data
    getCurrentUser(): User | null {
    try {
      const userData = Cookies.get(AuthService.USER_KEY);
      console.log('Getting user data from cookie:', userData);
      if (userData) {
        const parsed = JSON.parse(userData);
        console.log('Parsed user data:', parsed);
        return parsed;
      }
      console.log('No user data found in cookie');
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Get current organization data
    getCurrentOrganization(): CasaOrganization | null {
    try {
      const organizationData = Cookies.get(AuthService.ORGANIZATION_KEY);
      console.log('Getting organization data from cookie:', organizationData);
      if (organizationData) {
        const parsed = JSON.parse(organizationData);
        console.log('Parsed organization data:', parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error getting organization data:', error);
      return null;
    }
  }

  // Get auth token
  getToken(): string | undefined {
    return Cookies.get(AuthService.TOKEN_KEY);
  }

  // Get refresh token
  getRefreshToken(): string | undefined {
    return Cookies.get(AuthService.REFRESH_TOKEN_KEY);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Switch organization
    async switchOrganization(organizationId: string): Promise<ApiResponse<OrganizationSwitchResponse>> {
    try {
      const response = await apiClient.post('casa/v1/switch-organization', { organization_id: organizationId });
      
      if (response.success && response.data) {
        const { organization } = response.data as any;
        this.setOrganization(organization);
        
        return {
          success: true,
          data: { organization },
        };
      }

      return {
        success: false,
        error: 'Failed to switch organization'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to switch organization',
      };
    }
  }

  // Request password reset
    async requestPasswordReset(email: string): Promise<ApiResponse<PasswordResetResponse>> {
    try {
      const response = await apiClient.saasPost('password-reset', { email });
      return response as ApiResponse<PasswordResetResponse>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Password reset request failed',
      };
    }
  }

  // Reset password
    async resetPassword(token: string, newPassword: string): Promise<ApiResponse<PasswordResetResponse>> {
    try {
      const response = await apiClient.saasPost('password-reset/confirm', {
        token,
        password: newPassword,
      });
      return response as ApiResponse<PasswordResetResponse>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Password reset failed',
      };
    }
  }

  // Update user profile
    async updateProfile(data: Partial<User>): Promise<ApiResponse<ProfileUpdateResponse>> {
    try {
      const response = await apiClient.saasPost('profile/update', data);
      
      if (response.success && response.data) {
        const { user } = response.data as any;
        this.setUser(user);
        
        return {
          success: true,
          data: { user },
        };
      }

      return {
        success: false,
        error: 'Profile update failed'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Profile update failed',
      };
    }
  }

  // Private methods for managing auth data
    private setAuthData(token: string, user: User, organization: CasaOrganization | null, refreshToken?: string): void {
    // Cookie options with proper settings for persistence
    const cookieOptions: Cookies.CookieAttributes = {
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };

    console.log('Setting auth data - organization:', organization);
    console.log('Setting auth data - user:', user);
    console.log('Setting auth data - token:', token ? 'present' : 'missing');

    Cookies.set(AuthService.TOKEN_KEY, token, cookieOptions);
    Cookies.set(AuthService.USER_KEY, JSON.stringify(user), cookieOptions);

    if (organization) {
      console.log('Storing organization in cookie:', JSON.stringify(organization));
      Cookies.set(AuthService.ORGANIZATION_KEY, JSON.stringify(organization), cookieOptions);
      // Set organization context in API client
      apiClient.setTenant(organization.id); // TODO: Update apiClient to use organization
    } else {
      console.log('No organization to store');
    }

    if (refreshToken) {
      Cookies.set(AuthService.REFRESH_TOKEN_KEY, refreshToken, cookieOptions);
    }
  }

    private setUser(user: User): void {
    const cookieOptions: Cookies.CookieAttributes = {
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };
    Cookies.set(AuthService.USER_KEY, JSON.stringify(user), cookieOptions);
  }

    private setOrganization(organization: CasaOrganization): void {
    const cookieOptions: Cookies.CookieAttributes = {
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };
    Cookies.set(AuthService.ORGANIZATION_KEY, JSON.stringify(organization), cookieOptions);
    apiClient.setTenant(organization.id); // TODO: Update apiClient to use organization
  }

    private clearAuthData(): void {
    const removeOptions = { path: '/' };
    Cookies.remove(AuthService.TOKEN_KEY, removeOptions);
    Cookies.remove(AuthService.USER_KEY, removeOptions);
    Cookies.remove(AuthService.ORGANIZATION_KEY, removeOptions);
    Cookies.remove(AuthService.REFRESH_TOKEN_KEY, removeOptions);
  }

  // Check user permission
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    
    if (!user) return false;

    // Super admin has all permissions
    if (user.roles.includes('administrator')) return true;

    // Check specific permissions based on roles
    const rolePermissions: Record<string, string[]> = {
      'tenant_admin': ['manage_users', 'manage_forms', 'view_analytics', 'manage_settings'],
      'manager': ['manage_forms', 'view_analytics', 'view_submissions'],
      'editor': ['manage_forms', 'view_submissions'],
      'viewer': ['view_submissions'],
    };

    return user.roles.some(role => rolePermissions[role]?.includes(permission));
  }

  // Check if user can access organization
  canAccessOrganization(organizationId: string): boolean {
    const user = this.getCurrentUser();
    return (user?.organizationId === organizationId) || (user?.roles.includes('administrator') ?? false);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;