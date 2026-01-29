import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/common/Toast';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';
import Cookies from 'js-cookie';

interface OrganizationSettings {
  name: string;
  slug: string;
  domain: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  allow_volunteer_self_registration: boolean;
  require_background_check: boolean;
  max_cases_per_volunteer: number;
  training_requirements: string;
  contact_frequency_days: number;
}

interface UserInviteFormData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  send_invitation: boolean;
}

interface UserManagementData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login: string;
  cases_assigned: number;
}

interface PasswordChangeData {
  new_password: string;
  confirm_password: string;
}

interface SecuritySettings {
  require_min_length: boolean;
  require_mixed_case: boolean;
  require_special_chars: boolean;
  require_numbers: boolean;
  session_timeout_minutes: number;
}

interface NotificationSettings {
  new_case_assignments: boolean;
  upcoming_court_dates: boolean;
  overdue_contact_logs: boolean;
  volunteer_registration_requests: boolean;
  task_reminders: boolean;
  report_due_reminders: boolean;
}

// All 50 US States
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'VI', label: 'Virgin Islands' },
  { value: 'GU', label: 'Guam' },
];

const mockUsers: UserManagementData[] = [
  {
    id: '1',
    name: 'Walter Jones',
    email: 'walterjonesjr@gmail.com',
    role: 'Administrator',
    status: 'Active',
    last_login: '2024-12-15',
    cases_assigned: 0,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'Supervisor',
    status: 'Active',
    last_login: '2024-12-14',
    cases_assigned: 5,
  },
  {
    id: '3',
    name: 'John Davis',
    email: 'john.davis@example.com',
    role: 'Volunteer',
    status: 'Active',
    last_login: '2024-12-13',
    cases_assigned: 2,
  },
];

export default function Settings() {
  const { user, loading } = useRequireAuth();
  const { hasRole } = usePermissions();
  const { theme, resolvedTheme, setTheme, colorTheme, setColorTheme } = useTheme();
  const { showToast } = useToast();

  // All hooks must be called before any conditional returns
  const [activeTab, setActiveTab] = useState('organization');
  const [users, setUsers] = useState<UserManagementData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationSettings | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserManagementData | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    require_min_length: true,
    require_mixed_case: true,
    require_special_chars: false,
    require_numbers: false,
    session_timeout_minutes: 30,
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    new_case_assignments: true,
    upcoming_court_dates: true,
    overdue_contact_logs: false,
    volunteer_registration_requests: false,
    task_reminders: true,
    report_due_reminders: false,
  });
  const [savingSecuritySettings, setSavingSecuritySettings] = useState(false);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  const {
    register: registerOrg,
    handleSubmit: handleSubmitOrg,
    formState: { errors: errorsOrg },
    reset: resetOrg,
    watch: watchOrg,
  } = useForm<OrganizationSettings>({
    defaultValues: {
      name: '',
      slug: '',
      domain: 'casa-backend.local',
      allow_volunteer_self_registration: true,
      require_background_check: true,
      max_cases_per_volunteer: 5,
      contact_frequency_days: 30,
    },
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: errorsUser },
    reset: resetUser,
  } = useForm<UserInviteFormData>({
    defaultValues: {
      send_invitation: true,
    },
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: errorsPassword }, reset: resetPassword } = useForm<PasswordChangeData>();

  // Load users from API
  const loadUsers = async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      console.log('Loading users for user:', user);
      
      const response = await apiClient.casaGet('users');
      console.log('Users API response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data || {}));
      
      if (response.success && response.data) {
        // Handle nested response structure
        let usersData = response.data.users || [];
        console.log('Raw users data:', usersData);
        
        // Check if the response is nested (has success and data properties)
        if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
          console.log('Detected nested users response structure, extracting data');
          usersData = response.data.data.users || [];
          console.log('Extracted users data:', usersData);
        }
        
        const formattedUsers: UserManagementData[] = usersData.map((userData: any) => ({
          id: userData.id.toString(),
          name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          email: userData.email,
          role: userData.casa_role || userData.role || 'Volunteer',
          status: userData.status || 'Active',
          last_login: userData.last_login || 'Never',
          cases_assigned: userData.assigned_cases_count || 0,
        }));
        
        console.log('Formatted users:', formattedUsers);
        setUsers(formattedUsers);
      } else {
        console.log('No users data in response:', response);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load users when component mounts
  useEffect(() => {
    console.log('useEffect triggered for loadUsers, user:', user);
    loadUsers();
  }, [user]);

  // Load organization data
  useEffect(() => {
    const loadOrganizationData = async () => {
      if (!user) return;
      
      try {
        console.log('Loading organization data for user:', user);
        
        // Get the user's current organization from the backend
        const userProfileResponse = await apiClient.casaGet('user/profile');
        console.log('User profile response:', userProfileResponse);
        
        if (userProfileResponse.success && userProfileResponse.data) {
          // Handle nested response structure
          let userData = userProfileResponse.data as any;
          console.log('Full user data:', userData);
          console.log('User data type:', typeof userData);
          console.log('User data keys:', Object.keys(userData));
          
          // Check if the response is nested (has success and data properties)
          if (userData && typeof userData === 'object' && 'success' in userData && 'data' in userData) {
            console.log('Detected nested response structure, extracting data');
            userData = userData.data;
            console.log('Extracted user data:', userData);
            console.log('Extracted user data keys:', Object.keys(userData));
          }
          
          // Try different possible property names for organization ID
          const userOrgId = userData.organizationId || userData.organization_id || userData.current_organization_id;
          console.log('User organization ID:', userOrgId);
          
          if (userOrgId) {
            // Get organization details - the endpoint automatically returns user's organization
            const orgsResponse = await apiClient.casaGet('organizations');
            console.log('Organizations response:', orgsResponse);
            
            if (orgsResponse.success && orgsResponse.data) {
              console.log('Raw organizations response data (first path):', orgsResponse.data);
              
              // Handle different response structures
              let organizations: any[];
              if (Array.isArray(orgsResponse.data)) {
                organizations = orgsResponse.data;
              } else if (orgsResponse.data && Array.isArray(orgsResponse.data.data)) {
                organizations = orgsResponse.data.data;
              } else {
                organizations = [orgsResponse.data];
              }
              
              const currentOrg = organizations[0];
              console.log('Processed organizations array (first path):', organizations);
              console.log('Current organization object (first path):', currentOrg);
              
              if (currentOrg) {
                console.log('Found organization:', currentOrg);
                console.log('Organization name:', currentOrg.name);
                console.log('Organization slug:', currentOrg.slug);
                
                // Parse address if it contains city, state, zip in one line
                let streetAddress = currentOrg.address || '';
                let city = currentOrg.city || '';
                let state = currentOrg.state || '';
                let zipCode = currentOrg.zip_code || '';

                // If city/state/zip are empty but address contains them, try to parse
                if (streetAddress && !city && !state && !zipCode) {
                  // Pattern: "Street Address, City, ST ZIPCODE" or "Street Address, City, ST ZIP"
                  const addressMatch = streetAddress.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
                  if (addressMatch) {
                    streetAddress = addressMatch[1].trim();
                    city = addressMatch[2].trim();
                    state = addressMatch[3].trim();
                    zipCode = addressMatch[4].trim();
                  }
                }

                const orgSettings: OrganizationSettings = {
                  name: currentOrg.name || '',
                  slug: currentOrg.slug || '',
                  domain: currentOrg.domain || 'casa-backend.local',
                  address: streetAddress,
                  city: city,
                  state: state,
                  zip_code: zipCode,
                  phone: currentOrg.phone || '',
                  email: currentOrg.contact_email || '', // Map contact_email to email field
                  website: '',
                  allow_volunteer_self_registration: true,
                  require_background_check: true,
                  max_cases_per_volunteer: 5,
                  training_requirements: '',
                  contact_frequency_days: 30,
                };

                console.log('Setting organization data:', orgSettings);
                setOrganizationData(orgSettings);
                resetOrg(orgSettings); // Update form with real data
                console.log('Form should now be populated with organization data');
              } else {
                console.error('No organization found for user');
                showToast({ type: 'error', title: 'Error', description: 'Could not load your organization data. Please contact support.' });
              }
            } else {
              console.error('Failed to get organization data');
              showToast({ type: 'error', title: 'Error', description: 'Could not load organization data. Please contact support.' });
            }
          } else {
            console.error('User has no organization assigned in API response');
            console.log('Trying to use organization from auth context...');
            
            // Fallback: try to use organization from auth context
            if (user && user.organizationId) {
              console.log('Using organization from auth context:', user.organizationId);
              
              // The organizations endpoint automatically returns the user's organization
              const orgsResponse = await apiClient.casaGet('organizations');
              console.log('Organizations response (from auth context):', orgsResponse);
              
              if (orgsResponse.success && orgsResponse.data) {
                console.log('Raw organizations response data:', orgsResponse.data);
                
                // Handle different response structures
                let organizations: any[];
                if (Array.isArray(orgsResponse.data)) {
                  organizations = orgsResponse.data;
                } else if (orgsResponse.data && Array.isArray(orgsResponse.data.data)) {
                  organizations = orgsResponse.data.data;
                } else {
                  organizations = [orgsResponse.data];
                }
                
                const currentOrg = organizations[0];
                console.log('Processed organizations array:', organizations);
                console.log('Current organization object:', currentOrg);
                
                if (currentOrg) {
                  console.log('Found organization from auth context:', currentOrg);
                  console.log('Organization name:', currentOrg.name);
                  console.log('Organization slug:', currentOrg.slug);
                  
                  // Parse address if it contains city, state, zip in one line
                  let streetAddress2 = currentOrg.address || '';
                  let city2 = currentOrg.city || '';
                  let state2 = currentOrg.state || '';
                  let zipCode2 = currentOrg.zip_code || '';

                  // If city/state/zip are empty but address contains them, try to parse
                  if (streetAddress2 && !city2 && !state2 && !zipCode2) {
                    // Pattern: "Street Address, City, ST ZIPCODE" or "Street Address, City, ST ZIP"
                    const addressMatch2 = streetAddress2.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
                    if (addressMatch2) {
                      streetAddress2 = addressMatch2[1].trim();
                      city2 = addressMatch2[2].trim();
                      state2 = addressMatch2[3].trim();
                      zipCode2 = addressMatch2[4].trim();
                    }
                  }

                  const orgSettings: OrganizationSettings = {
                    name: currentOrg.name || '',
                    slug: currentOrg.slug || '',
                    domain: currentOrg.domain || 'casa-backend.local',
                    address: streetAddress2,
                    city: city2,
                    state: state2,
                    zip_code: zipCode2,
                    phone: currentOrg.phone || '',
                    email: currentOrg.contact_email || '',
                    website: '',
                    allow_volunteer_self_registration: true,
                    require_background_check: true,
                    max_cases_per_volunteer: 5,
                    training_requirements: '',
                    contact_frequency_days: 30,
                  };

                  console.log('Setting organization data:', orgSettings);
                  setOrganizationData(orgSettings);
                  resetOrg(orgSettings);
                  console.log('Form should now be populated with organization data');
                } else {
                  showToast({ type: 'error', title: 'Error', description: 'Could not load your organization data. Please contact support.' });
                }
              } else {
                showToast({ type: 'error', title: 'Error', description: 'Could not load organization data. Please contact support.' });
              }
            } else {
              console.error('No organization found in API response or auth context');
              showToast({ type: 'error', title: 'Error', description: 'You are not assigned to any organization. Please contact support.' });
            }
          }
        } else {
          console.error('Failed to get user profile');
          showToast({ type: 'error', title: 'Error', description: 'Could not load user profile. Please contact support.' });
        }
      } catch (error) {
        console.error('Failed to load organization data:', error);
        showToast({ type: 'error', title: 'Error', description: 'Failed to load organization data. Please try again or contact support.' });
      }
    };

    loadOrganizationData();
  }, [user, resetOrg]);

  // Load security settings
  useEffect(() => {
    const loadSecuritySettings = async () => {
      if (!user) return;
      try {
        const response = await apiClient.casaGet('settings/security');
        if (response.success && response.data) {
          let settingsData = response.data;
          // Handle nested response
          if (settingsData && typeof settingsData === 'object' && 'success' in settingsData && 'data' in settingsData) {
            settingsData = settingsData.data;
          }
          setSecuritySettings(prev => ({
            ...prev,
            ...settingsData,
          }));
        }
      } catch (error) {
        console.error('Failed to load security settings:', error);
      }
    };
    loadSecuritySettings();
  }, [user]);

  // Load notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user) return;
      try {
        const response = await apiClient.casaGet('settings/notifications');
        if (response.success && response.data) {
          let settingsData = response.data;
          // Handle nested response
          if (settingsData && typeof settingsData === 'object' && 'success' in settingsData && 'data' in settingsData) {
            settingsData = settingsData.data;
          }
          setNotificationSettings(prev => ({
            ...prev,
            ...settingsData,
          }));
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadNotificationSettings();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Only allow administrators to access settings
  if (!hasRole(['administrator', 'casa_administrator'])) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-secondary dark:bg-fintech-bg-primary">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Denied</h1>
              <p className="text-gray-600 dark:text-gray-300">You do not have permission to access the settings page. Only administrators can manage organization settings.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onSubmitOrganization = async (data: OrganizationSettings) => {
    try {
      setIsSubmitting(true);
      
      console.log('Submitting organization data:', data);
      console.log('User organization ID:', user?.organizationId);
      
      // Submit to WordPress API - only send fields that exist in the database
      const updateData = {
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        address: data.address,
        phone: data.phone,
        contact_email: data.email, // Map email to contact_email
        allow_volunteer_self_registration: data.allow_volunteer_self_registration,
        require_background_check: data.require_background_check,
        max_cases_per_volunteer: data.max_cases_per_volunteer,
        training_requirements: data.training_requirements,
        contact_frequency_days: data.contact_frequency_days,
        organization_id: user?.organizationId,
      };
      
      console.log('Sending request to organizations/update with data:', updateData);
      
      const response = await apiClient.casaPost('organizations/update', updateData);

      console.log('Response from organizations/update:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update organization settings');
      }

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      
    } catch (error) {
      console.error('Failed to update organization settings:', error);
      showToast({ type: 'error', title: 'Error', description: 'Failed to update settings. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitUserInvite = async (data: UserInviteFormData) => {
    try {
      setIsSubmitting(true);
      
      // Submit to WordPress API
      const response = await apiClient.casaPost('users/invite', {
        ...data,
        organization_id: user?.organizationId,
        invited_by: user?.id || '',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to invite user');
      }

      // Add to local list (in real app, would refresh from API)
      const newUser: UserManagementData = {
        id: Date.now().toString(),
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        role: data.role,
        status: 'Invited',
        last_login: 'Never',
        cases_assigned: 0,
      };
      // Reload users list to include the new user
      await loadUsers();

      resetUser();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      
    } catch (error) {
      console.error('Failed to invite user:', error);
      showToast({ type: 'error', title: 'Error', description: 'Failed to send invitation. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    if (action === 'delete' && !confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      const response = await apiClient.casaPost(`users/${userId}/${action}`, {
        organization_id: user?.organizationId,
      });

      if (!response.success) {
        throw new Error(response.error || `Failed to ${action} user`);
      }

      // Reload users list to reflect changes
      await loadUsers();

    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      showToast({ type: 'error', title: 'Error', description: `Failed to ${action} user. Please try again.` });
    }
  };

  const handlePasswordChange = async (userId: string, data: PasswordChangeData) => {
    if (data.new_password !== data.confirm_password) {
      showToast({ type: 'warning', title: 'Password Mismatch', description: 'Passwords do not match. Please try again.' });
      return;
    }

    try {
      const response = await apiClient.casaPost(`users/${userId}/change-password`, {
        new_password: data.new_password,
        organization_id: user?.organizationId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to change password');
      }

      showToast({ type: 'success', title: 'Success', description: 'Password changed successfully.' });
      resetPassword();

    } catch (error) {
      console.error('Failed to change password:', error);
      showToast({ type: 'error', title: 'Error', description: 'Failed to change password. Please try again.' });
    }
  };

  const handleSecuritySettingChange = (key: keyof SecuritySettings, value: boolean | number) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSecuritySettings = async () => {
    try {
      setSavingSecuritySettings(true);

      const response = await apiClient.casaPost('settings/security', {
        organization_id: user?.organizationId,
        ...securitySettings,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save security settings');
      }

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to save security settings:', error);
      showToast({ type: 'error', title: 'Error', description: 'Failed to save security settings. Please try again.' });
    } finally {
      setSavingSecuritySettings(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setSavingNotificationSettings(true);

      const response = await apiClient.casaPost('settings/notifications', {
        organization_id: user?.organizationId,
        ...notificationSettings,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save notification settings');
      }

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      showToast({ type: 'error', title: 'Error', description: 'Failed to save notification settings. Please try again.' });
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  const tabs = [
    { id: 'organization', name: 'Organization', icon: '🏢' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
  ];

  return (
    <>
      <Head>
        <title>Settings - CASA Case Management</title>
        <meta name="description" content="Manage organization settings and users" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-secondary dark:bg-fintech-bg-primary">
        {/* Header Navigation */}
        <Navigation currentPage="/settings" />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Settings</h1>
              <p className="text-purple-100 text-lg">Manage your CASA organization settings and users</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Message */}
          {submitSuccess && (
            <div className="mb-6 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Settings Updated Successfully!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your changes have been saved.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-fintech-bg-secondary dark:hover:bg-fintech-bg-secondary'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              {activeTab === 'organization' && (
                <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Organization Settings</h2>
                  
                  <form onSubmit={handleSubmitOrg(onSubmitOrganization)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Organization Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...registerOrg('name', { required: 'Organization name is required' })}
                          type="text"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errorsOrg.name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                        />
                        {errorsOrg.name && (
                          <p className="mt-1 text-sm text-red-600">{errorsOrg.name.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Organization Slug <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...registerOrg('slug', { required: 'Organization slug is required' })}
                          type="text"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errorsOrg.slug ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                          placeholder="demo-casa"
                        />
                        {errorsOrg.slug && (
                          <p className="mt-1 text-sm text-red-600">{errorsOrg.slug.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Contact Information</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                        <input
                          {...registerOrg('address')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                          <input
                            {...registerOrg('city')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                          <select
                            {...registerOrg('state')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Select State</option>
                            {US_STATES.map((state) => (
                              <option key={state.value} value={state.value}>
                                {state.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
                          <input
                            {...registerOrg('zip_code')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                          <input
                            {...registerOrg('phone')}
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                          <input
                            {...registerOrg('email')}
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Program Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Program Settings</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Cases per Volunteer
                          </label>
                          <input
                            {...registerOrg('max_cases_per_volunteer')}
                            type="number"
                            min="1"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Contact Frequency (days)
                          </label>
                          <input
                            {...registerOrg('contact_frequency_days')}
                            type="number"
                            min="7"
                            max="90"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            {...registerOrg('allow_volunteer_self_registration')}
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Allow volunteers to self-register
                          </span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            {...registerOrg('require_background_check')}
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Require background check for all volunteers
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-purple-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Save Organization Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  {/* Invite User */}
                  <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Invite New User</h2>
                    
                    <form onSubmit={handleSubmitUser(onSubmitUserInvite)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerUser('first_name', { required: 'First name is required' })}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.first_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                            }`}
                          />
                          {errorsUser.first_name && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.first_name.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerUser('last_name', { required: 'Last name is required' })}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.last_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                            }`}
                          />
                          {errorsUser.last_name && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.last_name.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerUser('email', { 
                              required: 'Email is required',
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address'
                              }
                            })}
                            type="email"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                            }`}
                          />
                          {errorsUser.email && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.email.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Role <span className="text-red-500">*</span>
                          </label>
                          <select
                            {...registerUser('role', { required: 'Role is required' })}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.role ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                            }`}
                          >
                            <option value="">Select Role</option>
                            <option value="administrator">Administrator</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="volunteer">Volunteer</option>
                          </select>
                          {errorsUser.role && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.role.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center">
                          <input
                            {...registerUser('send_invitation')}
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Send invitation email immediately
                          </span>
                        </label>
                      </div>
                      
                      <div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-purple-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Sending Invitation...' : 'Invite User'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* User List */}
                  <div className="bg-white dark:bg-fintech-bg-card rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Users</h2>
                    </div>

                    <div className="p-4">
                      {loadingUsers ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading users...</span>
                        </div>
                      ) : users.length === 0 ? (
                        <div className="flex flex-col items-center py-8">
                          <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</p>
                          <p className="text-sm text-gray-500 dark:text-gray-300">Invite your first user to get started.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {users.map((userItem) => (
                            <div key={userItem.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:bg-fintech-bg-secondary dark:hover:bg-fintech-bg-secondary">
                              {/* User Info Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                                <div className="mb-2 sm:mb-0">
                                  <div className="text-base font-medium text-gray-900 dark:text-white">{userItem.name}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-300">{userItem.email}</div>
                                </div>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full self-start sm:self-auto ${
                                  userItem.status === 'Active'
                                    ? 'bg-green-100 text-green-800'
                                    : userItem.status === 'Invited'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {userItem.status}
                                </span>
                              </div>

                              {/* Details Row */}
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                                <div>
                                  <span className="font-medium">Role:</span> {userItem.role}
                                </div>
                                <div>
                                  <span className="font-medium">Last Login:</span> {userItem.last_login}
                                </div>
                                <div>
                                  <span className="font-medium">Cases:</span> {userItem.cases_assigned}
                                </div>
                              </div>

                              {/* Actions Row */}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setSelectedUserForPassword(userItem)}
                                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  Reset Password
                                </button>
                                {userItem.status === 'Active' ? (
                                  <button
                                    onClick={() => handleUserAction(userItem.id, 'deactivate')}
                                    className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUserAction(userItem.id, 'activate')}
                                    className="inline-flex items-center px-3 py-1.5 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                                  >
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Activate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUserAction(userItem.id, 'delete')}
                                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Change Modal */}
                  {selectedUserForPassword && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Change Password for {selectedUserForPassword.name}
                          </h3>
                          
                          <form onSubmit={handleSubmitPassword((data) => handlePasswordChange(selectedUserForPassword.id, data))} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password <span className="text-red-500">*</span>
                              </label>
                              <input
                                {...registerPassword('new_password', { 
                                  required: 'New password is required',
                                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                                })}
                                type="password"
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  errorsPassword.new_password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                                }`}
                              />
                              {errorsPassword.new_password && (
                                <p className="mt-1 text-sm text-red-600">{errorsPassword.new_password.message}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm New Password <span className="text-red-500">*</span>
                              </label>
                              <input
                                {...registerPassword('confirm_password', { 
                                  required: 'Please confirm your password'
                                })}
                                type="password"
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  errorsPassword.confirm_password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                                }`}
                              />
                              {errorsPassword.confirm_password && (
                                <p className="mt-1 text-sm text-red-600">{errorsPassword.confirm_password.message}</p>
                              )}
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForPassword(null);
                                  resetPassword();
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                Change Password
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'security' && (
                <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Security Settings</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Password Policy</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                        Configure password requirements for all users in your organization.
                      </p>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={securitySettings.require_min_length}
                            onChange={(e) => handleSecuritySettingChange('require_min_length', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require minimum 8 characters</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={securitySettings.require_mixed_case}
                            onChange={(e) => handleSecuritySettingChange('require_mixed_case', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require uppercase and lowercase letters</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={securitySettings.require_special_chars}
                            onChange={(e) => handleSecuritySettingChange('require_special_chars', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require special characters (!@#$%^&*)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={securitySettings.require_numbers}
                            onChange={(e) => handleSecuritySettingChange('require_numbers', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require at least one number</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Session Management</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                        Control how long users can remain logged in without activity.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Session Timeout (minutes)
                          </label>
                          <input
                            type="number"
                            value={securitySettings.session_timeout_minutes}
                            onChange={(e) => handleSecuritySettingChange('session_timeout_minutes', parseInt(e.target.value) || 30)}
                            min="5"
                            max="480"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                            Users will be logged out after this period of inactivity (5-480 minutes)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={saveSecuritySettings}
                        disabled={savingSecuritySettings}
                        className="bg-purple-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {savingSecuritySettings ? 'Saving...' : 'Save Security Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notification Settings</h2>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Email Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                        Configure which email notifications are sent to users in your organization.
                      </p>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.new_case_assignments}
                            onChange={(e) => handleNotificationSettingChange('new_case_assignments', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">New case assignments</span>
                          <span className="ml-2 text-xs text-gray-400">- Notify volunteers when assigned to a new case</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.upcoming_court_dates}
                            onChange={(e) => handleNotificationSettingChange('upcoming_court_dates', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Upcoming court dates</span>
                          <span className="ml-2 text-xs text-gray-400">- Remind volunteers about upcoming hearings</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.overdue_contact_logs}
                            onChange={(e) => handleNotificationSettingChange('overdue_contact_logs', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Overdue contact logs</span>
                          <span className="ml-2 text-xs text-gray-400">- Alert when contact logs are overdue</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.volunteer_registration_requests}
                            onChange={(e) => handleNotificationSettingChange('volunteer_registration_requests', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Volunteer registration requests</span>
                          <span className="ml-2 text-xs text-gray-400">- Notify admins of new volunteer signups</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.task_reminders}
                            onChange={(e) => handleNotificationSettingChange('task_reminders', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Task reminders</span>
                          <span className="ml-2 text-xs text-gray-400">- Remind users of upcoming task deadlines</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={notificationSettings.report_due_reminders}
                            onChange={(e) => handleNotificationSettingChange('report_due_reminders', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Report due reminders</span>
                          <span className="ml-2 text-xs text-gray-400">- Alert volunteers when reports are due</span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={saveNotificationSettings}
                        disabled={savingNotificationSettings}
                        className="bg-purple-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {savingNotificationSettings ? 'Saving...' : 'Save Notification Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Appearance Settings</h2>

                  <div className="space-y-8">
                    {/* Theme Selection */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Color Theme</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                        Choose a color theme for your CASA dashboard.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Default Theme */}
                        <button
                          onClick={() => setColorTheme('default')}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            colorTheme === 'default'
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600"></div>
                            <span className="font-medium text-gray-900 dark:text-white">Default</span>
                          </div>
                          <div className="flex space-x-1">
                            <div className="w-6 h-4 rounded bg-purple-600"></div>
                            <div className="w-6 h-4 rounded bg-blue-600"></div>
                            <div className="w-6 h-4 rounded bg-gray-200"></div>
                          </div>
                          {colorTheme === 'default' && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>

                        {/* Theme 1 - Slack-inspired */}
                        <button
                          onClick={() => setColorTheme('theme1')}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            colorTheme === 'theme1'
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#611f69] to-[#4a154b]"></div>
                            <span className="font-medium text-gray-900 dark:text-white">Theme 1</span>
                          </div>
                          <div className="flex space-x-1">
                            <div className="w-6 h-4 rounded bg-[#611f69]"></div>
                            <div className="w-6 h-4 rounded bg-[#4a154b]"></div>
                            <div className="w-6 h-4 rounded bg-[#e8d5e1]"></div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">Aubergine & Purple</p>
                          {colorTheme === 'theme1' && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-[#611f69] rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>

                        {/* Theme 2 - Monday-inspired */}
                        <button
                          onClick={() => setColorTheme('theme2')}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            colorTheme === 'theme2'
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0073ea] to-[#00d2d3]"></div>
                            <span className="font-medium text-gray-900 dark:text-white">Theme 2</span>
                          </div>
                          <div className="flex space-x-1">
                            <div className="w-6 h-4 rounded bg-[#0073ea]"></div>
                            <div className="w-6 h-4 rounded bg-[#00d2d3]"></div>
                            <div className="w-6 h-4 rounded bg-[#cce5ff]"></div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">Vibrant Blue</p>
                          {colorTheme === 'theme2' && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-[#0073ea] rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Dark Mode</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                        Switch between light and dark modes for comfortable viewing.
                      </p>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all ${
                            resolvedTheme === 'light'
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Light</div>
                            <div className="text-xs text-gray-500 dark:text-gray-300">Bright & clean</div>
                          </div>
                        </button>

                        <button
                          onClick={() => setTheme('dark')}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all ${
                            resolvedTheme === 'dark'
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Dark</div>
                            <div className="text-xs text-gray-500 dark:text-gray-300">Easy on the eyes</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                      <div className={`p-6 rounded-xl border ${resolvedTheme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 dark:bg-fintech-bg-secondary border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className={`text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            Sample Card
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            colorTheme === 'theme1'
                              ? 'bg-[#611f69] text-white'
                              : colorTheme === 'theme2'
                              ? 'bg-[#0073ea] text-white'
                              : 'bg-purple-600 text-white'
                          }`}>
                            Active
                          </span>
                        </div>
                        <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                          This is how your dashboard cards will look with the selected theme.
                        </p>
                        <button className={`mt-4 px-4 py-2 rounded-lg text-white font-medium ${
                          colorTheme === 'theme1'
                            ? 'bg-[#611f69] hover:bg-[#4a154b]'
                            : colorTheme === 'theme2'
                            ? 'bg-[#0073ea] hover:bg-[#0060c0]'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}>
                          Sample Button
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}