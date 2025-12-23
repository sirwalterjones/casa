import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { apiClient } from '@/services/apiClient';
import { authService } from '@/services/authService';
import { FormService } from '@/services/formService';
import { useToast } from '@/components/common/Toast';

interface RegisterFormData {
  organizationName: string;
  organizationSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  title?: string;
  address?: string;
}

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { showSuccessAnimation } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Submit to Formidable Forms first
      const formidableData = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        confirm_password: data.confirmPassword,
        phone: data.phone || '',
        organization: data.organizationName,
        role: 'casa_administrator'
      };

      // Submit to Formidable Forms (non-blocking - log errors but continue)
      try {
        await FormService.submitFormWithFallback('USER_REGISTRATION', formidableData);
      } catch (ffError) {
        console.warn('Formidable Forms submission failed:', ffError);
      }

      // Use single-step registration endpoint (same as organization-register.tsx)
      const response = await apiClient.casaPost('register-organization', {
        name: data.organizationName,
        slug: data.organizationSlug,
        adminEmail: data.email,
        adminPassword: data.password,
        adminFirstName: data.firstName,
        adminLastName: data.lastName,
        domain: 'casa-backend.local'
      });

      if (!response.success) {
        // Handle specific error cases
        let errorMessage = response.error || 'Failed to create organization and admin user';

        if (response.error?.includes('email already exists')) {
          errorMessage = 'An account with this email address already exists. Please use a different email address or try logging in instead.';
        } else if (response.error?.includes('slug already exists')) {
          errorMessage = 'An organization with this name already exists. Please choose a different organization name.';
        }

        throw new Error(errorMessage);
      }

      showSuccessAnimation();
      setSuccess(true);

      // Store credentials for auto-login if token returned
      if (response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        localStorage.setItem('organization_data', JSON.stringify(response.data.organization));

        Cookies.set('auth_token', response.data.token, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production'
        });

        // Auto-redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      // Redirect to login after 3 seconds if no auto-login
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
      
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Head>
          <title>Registration Successful - CASA Case Management</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Registration Successful!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your CASA organization has been registered. Redirecting to login...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Register Organization - CASA Case Management</title>
        <meta name="description" content="Register your CASA organization" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold text-gray-900">CASA Case Management</h1>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Register your CASA organization
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link
                href="/auth/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                sign in to existing account
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Registration failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
              
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('organizationName', { required: 'Organization name is required' })}
                  type="text"
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.organizationName ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="e.g., Metro CASA Program"
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="organizationSlug" className="block text-sm font-medium text-gray-700">
                  Organization Identifier <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('organizationSlug', { 
                    required: 'Organization identifier is required',
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: 'Only lowercase letters, numbers, and hyphens allowed'
                    }
                  })}
                  type="text"
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.organizationSlug ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="e.g., metro-casa"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be your unique URL identifier (lowercase, no spaces)
                </p>
                {errors.organizationSlug && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationSlug.message}</p>
                )}
              </div>
            </div>

            {/* Administrator Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Administrator Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('firstName', { required: 'First name is required' })}
                    type="text"
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('lastName', { required: 'Last name is required' })}
                    type="text"
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Job Title
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Program Director"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  type="password"
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type="password"
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Organization...
                  </div>
                ) : (
                  'Create CASA Organization'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}