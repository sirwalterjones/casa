import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/services/apiClient';
import { FormService } from '@/services/formService';
import Cookies from 'js-cookie';

interface OrganizationRegistrationForm {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  confirmPassword: string;
}

export default function OrganizationRegister() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue
  } = useForm<OrganizationRegistrationForm>();

  const watchName = watch('name');

  // Auto-generate slug from organization name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Update slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('slug', generateSlug(name));
  };

  const onSubmit = async (data: OrganizationRegistrationForm) => {
    if (data.adminPassword !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Submit to Formidable Forms - Organization Registration
      const formidableData = {
        organization_name: data.name,
        organization_slug: data.slug,
        contact_email: data.adminEmail,
        phone: '',
        address: '',
        website: '',
        director_name: `${data.adminFirstName} ${data.adminLastName}`,
        director_title: 'Administrator'
      };

      const formResponse = await FormService.submitFormWithFallback('ORGANIZATION_REGISTRATION', formidableData);
      
      if (!formResponse.success) {
        throw new Error(formResponse.error || 'Failed to submit organization registration form');
      }

      // Create organization and admin user in one call
      const requestData = {
        name: data.name,
        slug: data.slug,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        adminFirstName: data.adminFirstName,
        adminLastName: data.adminLastName,
        domain: 'casa-backend.local'
      };
      
      console.log('Sending registration data:', requestData);
      
      const response = await apiClient.casaPost('register-organization', requestData);

      if (response.success) {
        setSuccess(true);
        
        // Store the credentials for auto-login
        if (response.data?.token) {
          // Store in localStorage for persistence
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('user_data', JSON.stringify(response.data.user));
          localStorage.setItem('organization_data', JSON.stringify(response.data.organization));
          
          // Also set the token in cookies for API calls
          Cookies.set('auth_token', response.data.token, { 
            expires: 7, 
            secure: process.env.NODE_ENV === 'production' 
          });
        }
        
        // Auto-redirect to dashboard with the new credentials
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      } else {
        // Handle specific error cases
        let errorMessage = response.error || 'Failed to create organization and admin user';
        
        if (response.error?.includes('email already exists')) {
          errorMessage = 'An account with this email address already exists. Please use a different email address or try logging in instead.';
        } else if (response.error?.includes('slug already exists')) {
          errorMessage = 'An organization with this name already exists. Please choose a different organization name.';
        } else if (response.error?.includes('Missing required fields')) {
          errorMessage = 'Please fill in all required fields.';
        }
        
        setError(errorMessage);
        return;
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Registration failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Organization Created Successfully!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your CASA organization has been created and you're being automatically logged in. Redirecting to dashboard...
            </p>
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Setting up your account...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Register Your CASA Organization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a new CASA program to start managing cases and volunteers
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {isLoading && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Creating Your Organization
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    Please wait while we set up your CASA organization and admin account...
                  </div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Registration Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                  {error.includes('email already exists') && (
                    <div className="mt-3">
                      <Link
                        href="/auth/login"
                        className="text-sm font-medium text-red-800 hover:text-red-700 underline"
                      >
                        Try logging in instead →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            {/* Organization Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Organization Name *
                  </label>
                  <input
                    {...register('name', { 
                      required: 'Organization name is required',
                      minLength: { value: 3, message: 'Name must be at least 3 characters' }
                    })}
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="e.g., Metro CASA Program"
                    onChange={handleNameChange}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                    Organization Slug *
                  </label>
                  <input
                    {...register('slug', { 
                      required: 'Slug is required',
                      pattern: {
                        value: /^[a-z0-9-]+$/,
                        message: 'Slug can only contain lowercase letters, numbers, and hyphens'
                      }
                    })}
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="e.g., metro-casa-program"
                  />
                  {errors.slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    This will be used in your organization's URL
                  </p>
                </div>
              </div>
            </div>

            {/* Administrator Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Administrator Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700">
                    First Name *
                  </label>
                  <input
                    {...register('adminFirstName', { required: 'First name is required' })}
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="John"
                  />
                  {errors.adminFirstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminFirstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700">
                    Last Name *
                  </label>
                  <input
                    {...register('adminLastName', { required: 'Last name is required' })}
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Doe"
                  />
                  {errors.adminLastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminLastName.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  {...register('adminEmail', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="admin@example.com"
                />
                {errors.adminEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.adminEmail.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                <div>
                  <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <input
                    {...register('adminPassword', { 
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' }
                    })}
                    type="password"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                  {errors.adminPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password *
                  </label>
                  <input
                    {...register('confirmPassword', { required: 'Please confirm your password' })}
                    type="password"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm Password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Organization...' : 'Create Organization'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an organization?{' '}
              <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in here
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}