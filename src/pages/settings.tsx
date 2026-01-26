import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
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
  
  // Only allow administrators to access settings
  if (!hasRole(['administrator', 'casa_administrator'])) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600">You do not have permission to access the settings page. Only administrators can manage organization settings.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState('organization');
  const [users, setUsers] = useState<UserManagementData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationSettings | null>(null);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserManagementData | null>(null);

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
                alert('Error: Could not load your organization data. Please contact support.');
              }
            } else {
              console.error('Failed to get organization data');
              alert('Error: Could not load organization data. Please contact support.');
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
                  alert('Error: Could not load your organization data. Please contact support.');
                }
              } else {
                alert('Error: Could not load organization data. Please contact support.');
              }
            } else {
              console.error('No organization found in API response or auth context');
              alert('Error: You are not assigned to any organization. Please contact support.');
            }
          }
        } else {
          console.error('Failed to get user profile');
          alert('Error: Could not load user profile. Please contact support.');
        }
      } catch (error) {
        console.error('Failed to load organization data:', error);
        alert('Error: Failed to load organization data. Please try again or contact support.');
      }
    };

    loadOrganizationData();
  }, [user, resetOrg]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
      alert('Failed to update settings. Please try again.');
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
      alert('Failed to send invitation. Please try again.');
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
      alert(`Failed to ${action} user. Please try again.`);
    }
  };

  const handlePasswordChange = async (userId: string, data: PasswordChangeData) => {
    if (data.new_password !== data.confirm_password) {
      alert('Passwords do not match');
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

      alert('Password changed successfully');
      resetPassword();

    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please try again.');
    }
  };

  const tabs = [
    { id: 'organization', name: 'Organization', icon: '🏢' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
  ];

  return (
    <>
      <Head>
        <title>Settings - CASA Case Management</title>
        <meta name="description" content="Manage organization settings and users" />
      </Head>

      <div className="min-h-screen bg-gray-50">
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
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Organization Settings</h2>
                  
                  <form onSubmit={handleSubmitOrg(onSubmitOrganization)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...registerOrg('name', { required: 'Organization name is required' })}
                          type="text"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errorsOrg.name ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errorsOrg.name && (
                          <p className="mt-1 text-sm text-red-600">{errorsOrg.name.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Slug <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...registerOrg('slug', { required: 'Organization slug is required' })}
                          type="text"
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errorsOrg.slug ? 'border-red-300' : 'border-gray-300'
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
                      <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                          {...registerOrg('address')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            {...registerOrg('city')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <select
                            {...registerOrg('state')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Select State</option>
                            <option value="GA">Georgia</option>
                            <option value="AL">Alabama</option>
                            <option value="FL">Florida</option>
                            <option value="NC">North Carolina</option>
                            <option value="SC">South Carolina</option>
                            <option value="TN">Tennessee</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                          <input
                            {...registerOrg('zip_code')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            {...registerOrg('phone')}
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            {...registerOrg('email')}
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Program Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Program Settings</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Cases per Volunteer
                          </label>
                          <input
                            {...registerOrg('max_cases_per_volunteer')}
                            type="number"
                            min="1"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Frequency (days)
                          </label>
                          <input
                            {...registerOrg('contact_frequency_days')}
                            type="number"
                            min="7"
                            max="90"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            {...registerOrg('allow_volunteer_self_registration')}
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Allow volunteers to self-register
                          </span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            {...registerOrg('require_background_check')}
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
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
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Invite New User</h2>
                    
                    <form onSubmit={handleSubmitUser(onSubmitUserInvite)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerUser('first_name', { required: 'First name is required' })}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.first_name ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {errorsUser.first_name && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.first_name.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerUser('last_name', { required: 'Last name is required' })}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.last_name ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {errorsUser.last_name && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.last_name.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
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
                              errorsUser.email ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {errorsUser.email && (
                            <p className="mt-1 text-sm text-red-600">{errorsUser.email.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role <span className="text-red-500">*</span>
                          </label>
                          <select
                            {...registerUser('role', { required: 'Role is required' })}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              errorsUser.role ? 'border-red-300' : 'border-gray-300'
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
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
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
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900">Current Users</h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                      {loadingUsers ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          <span className="ml-2 text-gray-600">Loading users...</span>
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Login
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cases
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                  </svg>
                                  <p className="text-lg font-medium text-gray-900 mb-2">No users found</p>
                                  <p className="text-sm text-gray-500">Invite your first user to get started.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            users.map((userItem) => (
                            <tr key={userItem.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                                  <div className="text-sm text-gray-500">{userItem.email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {userItem.role}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  userItem.status === 'Active' 
                                    ? 'bg-green-100 text-green-800'
                                    : userItem.status === 'Invited'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {userItem.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {userItem.last_login}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {userItem.cases_assigned}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => setSelectedUserForPassword(userItem)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Change Password
                                </button>
                                {userItem.status === 'Active' ? (
                                  <button
                                    onClick={() => handleUserAction(userItem.id, 'deactivate')}
                                    className="text-yellow-600 hover:text-yellow-900"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUserAction(userItem.id, 'activate')}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Activate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUserAction(userItem.id, 'delete')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                          )}
                        </tbody>
                      </table>
                      )}
                    </div>
                  </div>

                  {/* Password Change Modal */}
                  {selectedUserForPassword && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Change Password for {selectedUserForPassword.name}
                          </h3>
                          
                          <form onSubmit={handleSubmitPassword((data) => handlePasswordChange(selectedUserForPassword.id, data))} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password <span className="text-red-500">*</span>
                              </label>
                              <input
                                {...registerPassword('new_password', { 
                                  required: 'New password is required',
                                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                                })}
                                type="password"
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  errorsPassword.new_password ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {errorsPassword.new_password && (
                                <p className="mt-1 text-sm text-red-600">{errorsPassword.new_password.message}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password <span className="text-red-500">*</span>
                              </label>
                              <input
                                {...registerPassword('confirm_password', { 
                                  required: 'Please confirm your password'
                                })}
                                type="password"
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  errorsPassword.confirm_password ? 'border-red-300' : 'border-gray-300'
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
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">Require minimum 8 characters</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">Require uppercase and lowercase letters</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">Require special characters</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Session Timeout (minutes)
                          </label>
                          <input
                            type="number"
                            defaultValue={30}
                            min="5"
                            max="480"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">New case assignments</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">Upcoming court dates</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">Overdue contact logs</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-purple-600" />
                          <span className="ml-2 text-sm text-gray-700">Volunteer registration requests</span>
                        </label>
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