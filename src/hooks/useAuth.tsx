import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@/services/authService';
import { User, CasaOrganization, LoginCredentials, RegisterCredentials, AuthContextType } from '@/types';

// Create Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<CasaOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      // Validate token and get user data
      const response = await authService.validateToken();
      
      if (response.success && response.data) {
        setUser(response.data.user);
        setOrganization(response.data.organization);
      } else {
        // Token is invalid, clear auth data
        await logout();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        setOrganization(response.data.organization);
        
        // Redirect to dashboard or intended page
        const redirectTo = router.query.redirect as string || '/dashboard';
        router.push(redirectTo);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setLoading(true);
      
      const response = await authService.register(credentials);
      
      if (response.success) {
        // Registration successful, redirect to login or verification page
        router.push('/auth/login?message=registration-success');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setOrganization(null);
      router.push('/auth/login');
    }
  };

  const switchOrganization = async (organizationId: string): Promise<void> => {
    try {
      setLoading(true);
      
      const response = await authService.switchOrganization(organizationId);
      
      if (response.success && response.data) {
        setOrganization(response.data.organization);
        
        // Refresh the page to update organization context
        router.reload();
      } else {
        throw new Error(response.error || 'Failed to switch organization');
      }
    } catch (error) {
      console.error('Switch organization error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      const response = await authService.updateProfile(updates);
      
      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      const response = await authService.refreshToken();
      
      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Refresh auth error:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    organization,
    login,
    logout,
    loading,
    switchOrganization,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Custom hook for protected routes
export const useRequireAuth = (redirectTo: string = '/auth/login') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`${redirectTo}?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading };
};

// Custom hook for role-based access
export const useRequireRole = (requiredRoles: string | string[], redirectTo: string = '/unauthorized') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const hasRequiredRole = useCallback(() => {
    if (!user) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.some(role => user.roles.includes(role));
  }, [user, requiredRoles]);

  useEffect(() => {
    if (!loading && user && !hasRequiredRole()) {
      router.push(redirectTo);
    }
  }, [user, loading, hasRequiredRole, router, redirectTo]);

  return { user, loading, hasRequiredRole: hasRequiredRole() };
};

// Custom hook for permission-based access
export const useRequirePermission = (permission: string, redirectTo: string = '/unauthorized') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const hasPermission = useCallback(() => {
    if (!user) return false;
    return authService.hasPermission(permission);
  }, [user, permission]);

  useEffect(() => {
    if (!loading && user && !hasPermission()) {
      router.push(redirectTo);
    }
  }, [user, loading, hasPermission, router, redirectTo]);

  return { user, loading, hasPermission: hasPermission() };
};

// Custom hook for organization access
export const useRequireOrganization = () => {
  const { organization, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !organization) {
      router.push('/organization-selection');
    }
  }, [organization, loading, router]);

  return { organization, loading };
};

// Custom hook for password reset
export const usePasswordReset = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.requestPasswordReset(email);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error || 'Failed to send reset email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.resetPassword(token, newPassword);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setSuccess(false);
    setError(null);
  };

  return {
    loading,
    success,
    error,
    requestReset,
    resetPassword,
    clearMessages,
  };
};

// Custom hook for user permissions
export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, [user]);

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => user.roles.includes(r));
  }, [user]);

  const canAccessOrganization = useCallback((organizationId: string): boolean => {
    return authService.canAccessOrganization(organizationId);
  }, [user]);

  return {
    hasPermission,
    hasRole,
    canAccessOrganization,
    isAdmin: hasRole(['administrator', 'supervisor']),
    isSuperAdmin: hasRole('administrator'),
  };
};

export default useAuth;