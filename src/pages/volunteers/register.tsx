import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import { VOLUNTEER_STATUS } from '@/utils/constants';
import { apiClient } from '@/services/apiClient';
import { FormService } from '@/services/formService';
import { useToast } from '@/components/common/Toast';

interface VolunteerRegistrationData {
  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  
  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  
  // Background Information
  employer?: string;
  occupation?: string;
  education_level?: string;
  languages_spoken?: string;
  previous_volunteer_experience?: string;
  
  // Availability
  preferred_schedule?: string;
  max_cases: number;
  availability_notes?: string;
  
  // References
  reference1_name: string;
  reference1_phone: string;
  reference1_relationship: string;
  reference2_name: string;
  reference2_phone: string;
  reference2_relationship: string;
  
  // Preferences
  age_preference?: string;
  gender_preference?: string;
  special_needs_experience?: boolean;
  transportation_available?: boolean;
  
  // Legal
  background_check_consent: boolean;
  liability_waiver: boolean;
  confidentiality_agreement: boolean;
}

export default function VolunteerRegistration() {
  const { user, loading } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { showToast, showSuccessAnimation } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<VolunteerRegistrationData>({
    defaultValues: {
      max_cases: 3,
      special_needs_experience: false,
      transportation_available: true,
      background_check_consent: false,
      liability_waiver: false,
      confidentiality_agreement: false,
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const onSubmit = async (data: VolunteerRegistrationData) => {
    try {
      setIsSubmitting(true);

      // Submit to Formidable Forms first
      const formidableData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        address: `${data.address}, ${data.city}, ${data.state} ${data.zip_code}`,
        date_of_birth: data.date_of_birth,
        availability: data.preferred_schedule || '',
        notes: data.previous_volunteer_experience || '',
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relationship: data.emergency_contact_relationship,
        employer: data.employer || '',
        occupation: data.occupation || '',
        education_level: data.education_level || '',
        languages_spoken: data.languages_spoken || '',
        previous_volunteer_experience: data.previous_volunteer_experience || '',
        preferred_schedule: data.preferred_schedule || '',
        max_cases: String(data.max_cases),
        availability_notes: data.availability_notes || '',
        reference1_name: data.reference1_name,
        reference1_phone: data.reference1_phone,
        reference1_relationship: data.reference1_relationship,
        reference2_name: data.reference2_name,
        reference2_phone: data.reference2_phone,
        reference2_relationship: data.reference2_relationship,
        age_preference: data.age_preference || '',
        gender_preference: data.gender_preference || '',
        special_needs_experience: data.special_needs_experience ? 'yes' : 'no',
        transportation_available: data.transportation_available ? 'yes' : 'no',
        background_check_consent: data.background_check_consent ? 'yes' : 'no',
        liability_waiver: data.liability_waiver ? 'yes' : 'no',
        confidentiality_agreement: data.confidentiality_agreement ? 'yes' : 'no',
      };

      // Submit to Formidable Forms (non-blocking - log errors but continue)
      try {
        await FormService.submitFormWithFallback('VOLUNTEER_REGISTRATION', formidableData);
      } catch (ffError) {
        console.warn('Formidable Forms submission failed:', ffError);
      }

      // Submit to CASA API
      const volunteerData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relationship: data.emergency_contact_relationship,
        employer: data.employer || '',
        occupation: data.occupation || '',
        education_level: data.education_level || '',
        languages_spoken: data.languages_spoken || '',
        previous_volunteer_experience: data.previous_volunteer_experience || '',
        preferred_schedule: data.preferred_schedule || '',
        max_cases: data.max_cases,
        availability_notes: data.availability_notes || '',
        reference1_name: data.reference1_name,
        reference1_phone: data.reference1_phone,
        reference1_relationship: data.reference1_relationship,
        reference2_name: data.reference2_name,
        reference2_phone: data.reference2_phone,
        reference2_relationship: data.reference2_relationship,
        age_preference: data.age_preference || '',
        gender_preference: data.gender_preference || '',
        special_needs_experience: data.special_needs_experience || false,
        transportation_available: data.transportation_available || false,
        background_check_consent: data.background_check_consent,
        liability_waiver: data.liability_waiver,
        confidentiality_agreement: data.confidentiality_agreement,
        volunteer_status: VOLUNTEER_STATUS.BACKGROUND_CHECK,
        organization_id: user?.organizationId || '',
        created_by: user?.id || '',
      };

      const response = await apiClient.casaPost('volunteers', volunteerData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to register volunteer');
      }

      console.log('Volunteer registered successfully:', response.data);

      // Show success animation
      showSuccessAnimation();

      setSubmitSuccess(true);
      reset();

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);

    } catch (error: any) {
      console.error('Failed to register volunteer:', error);
      showToast({ type: 'error', title: 'Submission failed', description: error?.message || 'Please check required fields and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Volunteer Registration - CASA Case Management System</title>
        <meta name="description" content="Register as a CASA volunteer" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">CASA Volunteer Registration</h1>
              <p className="text-green-100 text-lg">Join our community of advocates for children</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link
                href="/dashboard"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/volunteers/register"
                className="py-4 px-1 border-b-2 border-green-500 text-green-600 font-medium text-sm"
              >
                Volunteer Registration
              </Link>
              <Link
                href="/volunteers"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Volunteer Directory
              </Link>
            </nav>
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
                    Volunteer Registration Submitted!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your application has been received. Our team will contact you within 2-3 business days to begin the background check process.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                👤 Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('first_name', { required: 'First name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.first_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('last_name', { required: 'Last name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.last_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('phone', { required: 'Phone number is required' })}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('date_of_birth', { required: 'Date of birth is required' })}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.date_of_birth ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.date_of_birth && (
                    <p className="mt-1 text-sm text-red-600">{errors.date_of_birth.message}</p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('address', { required: 'Address is required' })}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Street address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('city', { required: 'City is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('state', { required: 'State is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.state ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="CA"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('zip_code', { required: 'ZIP code is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.zip_code ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="12345"
                  />
                  {errors.zip_code && (
                    <p className="mt-1 text-sm text-red-600">{errors.zip_code.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                🚨 Emergency Contact
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergency_contact_name', { required: 'Emergency contact name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.emergency_contact_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.emergency_contact_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergency_contact_phone', { required: 'Emergency contact phone is required' })}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.emergency_contact_phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.emergency_contact_phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_phone.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergency_contact_relationship', { required: 'Relationship is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.emergency_contact_relationship ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Spouse, Parent, Sibling, etc."
                  />
                  {errors.emergency_contact_relationship && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_relationship.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* References */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                📋 References
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-4">Reference 1</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference1_name', { required: 'Reference 1 name is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference1_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference1_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference1_name.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference1_phone', { required: 'Reference 1 phone is required' })}
                        type="tel"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference1_phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference1_phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference1_phone.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference1_relationship', { required: 'Reference 1 relationship is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference1_relationship ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Supervisor, Friend, etc."
                      />
                      {errors.reference1_relationship && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference1_relationship.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-4">Reference 2</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference2_name', { required: 'Reference 2 name is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference2_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference2_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference2_name.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference2_phone', { required: 'Reference 2 phone is required' })}
                        type="tel"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference2_phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference2_phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference2_phone.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference2_relationship', { required: 'Reference 2 relationship is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference2_relationship ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Supervisor, Friend, etc."
                      />
                      {errors.reference2_relationship && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference2_relationship.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Agreements */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                ⚖️ Legal Agreements
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    {...register('background_check_consent', { required: 'Background check consent is required' })}
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700">
                      Background Check Consent <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-600">
                      I consent to a comprehensive background check including criminal history, driving record, and reference verification.
                    </p>
                    {errors.background_check_consent && (
                      <p className="mt-1 text-sm text-red-600">{errors.background_check_consent.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <input
                    {...register('liability_waiver', { required: 'Liability waiver is required' })}
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700">
                      Liability Waiver <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-600">
                      I understand and accept the risks associated with volunteer work and agree to hold harmless the CASA organization.
                    </p>
                    {errors.liability_waiver && (
                      <p className="mt-1 text-sm text-red-600">{errors.liability_waiver.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <input
                    {...register('confidentiality_agreement', { required: 'Confidentiality agreement is required' })}
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700">
                      Confidentiality Agreement <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-600">
                      I agree to maintain strict confidentiality of all case information and comply with CASA privacy policies.
                    </p>
                    {errors.confidentiality_agreement && (
                      <p className="mt-1 text-sm text-red-600">{errors.confidentiality_agreement.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 max-w-xs bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-6 rounded-md font-semibold hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Application...
                  </div>
                ) : (
                  'Submit Volunteer Application'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}