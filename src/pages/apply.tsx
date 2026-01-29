import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { volunteerApplicationService } from '@/services/volunteerApplicationService';
import { VolunteerApplicationData, OrganizationPublicInfo } from '@/types';

export default function VolunteerApplication() {
  const router = useRouter();
  const { org } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [organization, setOrganization] = useState<OrganizationPublicInfo | null>(null);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VolunteerApplicationData>({
    defaultValues: {
      maxCases: 3,
      specialNeedsExperience: false,
      transportationAvailable: true,
      backgroundCheckConsent: false,
      liabilityWaiver: false,
      confidentialityAgreement: false,
    }
  });

  // Fetch organization info when org slug is available
  useEffect(() => {
    async function fetchOrganization() {
      if (!org || typeof org !== 'string') {
        setIsLoading(false);
        return;
      }

      try {
        const response = await volunteerApplicationService.getOrganizationPublicInfo(org);
        if (response.success && response.data) {
          setOrganization(response.data);
          setError('');
        } else {
          setError(response.error || 'Organization not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load organization');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [org]);

  const onSubmit = async (data: VolunteerApplicationData) => {
    if (!organization || !org) {
      setError('Organization information is missing');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await volunteerApplicationService.submitApplication(
        org as string,
        data
      );

      if (response.success && response.data) {
        setReferenceNumber(response.data.referenceNumber);
        setSubmitSuccess(true);
        reset();
      } else {
        setError(response.error || 'Failed to submit application');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Show error if no organization
  if (!org || error) {
    return (
      <>
        <Head>
          <title>Volunteer Application - CASA</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {!org ? 'Organization Required' : 'Organization Not Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              {!org
                ? 'Please use a valid application link with an organization specified (e.g., /apply?org=your-organization)'
                : error || 'The organization you are looking for does not exist or is not accepting applications.'}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Show success page
  if (submitSuccess) {
    return (
      <>
        <Head>
          <title>Application Submitted - {organization?.name || 'CASA'}</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-green-500 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Application Submitted!
            </h2>
            <p className="text-gray-600 mb-4">
              Thank you for applying to volunteer with {organization?.name}.
            </p>
            <div className="bg-gray-100 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-500 mb-1">Your Reference Number:</p>
              <p className="text-lg font-mono font-bold text-green-600">{referenceNumber}</p>
            </div>
            <div className="text-left bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>1. Our team will review your application within 2-3 business days</li>
                <li>2. We will contact you to schedule a background check</li>
                <li>3. Once approved, you will receive information about training</li>
                <li>4. After completing training, you will be assigned to cases</li>
              </ul>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Volunteer Application - {organization?.name || 'CASA'}</title>
        <meta name="description" content={`Apply to become a CASA volunteer with ${organization?.name}`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Volunteer Application</h1>
              <p className="text-green-100 text-lg">{organization?.name}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('firstName', { required: 'First name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('lastName', { required: 'Last name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
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
                    {...register('dateOfBirth', { required: 'Date of birth is required' })}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
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
                    maxLength={2}
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
                    {...register('zipCode', { required: 'ZIP code is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.zipCode ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="12345"
                  />
                  {errors.zipCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Emergency Contact</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergencyContactName', { required: 'Emergency contact name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.emergencyContactName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.emergencyContactName && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergencyContactName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergencyContactPhone', { required: 'Emergency contact phone is required' })}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.emergencyContactPhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.emergencyContactPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergencyContactPhone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergencyContactRelationship', { required: 'Relationship is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.emergencyContactRelationship ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Spouse, Parent, Sibling, etc."
                  />
                  {errors.emergencyContactRelationship && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergencyContactRelationship.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Employment Information (Optional)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                  <input
                    {...register('employer')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                  <input
                    {...register('occupation')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
                  <select
                    {...register('educationLevel')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select...</option>
                    <option value="high_school">High School</option>
                    <option value="some_college">Some College</option>
                    <option value="associates">Associate&apos;s Degree</option>
                    <option value="bachelors">Bachelor&apos;s Degree</option>
                    <option value="masters">Master&apos;s Degree</option>
                    <option value="doctorate">Doctorate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Languages Spoken</label>
                  <input
                    {...register('languagesSpoken')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="English, Spanish, etc."
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Volunteer Experience
                </label>
                <textarea
                  {...register('previousVolunteerExperience')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe any previous volunteer experience..."
                />
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Availability</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Schedule
                  </label>
                  <select
                    {...register('preferredSchedule')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select...</option>
                    <option value="weekday_mornings">Weekday Mornings</option>
                    <option value="weekday_afternoons">Weekday Afternoons</option>
                    <option value="weekday_evenings">Weekday Evenings</option>
                    <option value="weekend_mornings">Weekend Mornings</option>
                    <option value="weekend_afternoons">Weekend Afternoons</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Cases
                  </label>
                  <select
                    {...register('maxCases', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={1}>1 case</option>
                    <option value={2}>2 cases</option>
                    <option value={3}>3 cases</option>
                    <option value={4}>4 cases</option>
                    <option value={5}>5+ cases</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Availability Notes
                </label>
                <textarea
                  {...register('availabilityNotes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Any other availability information..."
                />
              </div>
            </div>

            {/* References */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6">References</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-4">Reference 1</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference1Name', { required: 'Reference 1 name is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference1Name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference1Name && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference1Name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference1Phone', { required: 'Reference 1 phone is required' })}
                        type="tel"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference1Phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference1Phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference1Phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference1Relationship', { required: 'Reference 1 relationship is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference1Relationship ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Supervisor, Colleague, etc."
                      />
                      {errors.reference1Relationship && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference1Relationship.message}</p>
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
                        {...register('reference2Name', { required: 'Reference 2 name is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference2Name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference2Name && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference2Name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference2Phone', { required: 'Reference 2 phone is required' })}
                        type="tel"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference2Phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.reference2Phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference2Phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register('reference2Relationship', { required: 'Reference 2 relationship is required' })}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.reference2Relationship ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Supervisor, Colleague, etc."
                      />
                      {errors.reference2Relationship && (
                        <p className="mt-1 text-sm text-red-600">{errors.reference2Relationship.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Preferences (Optional)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Preference
                  </label>
                  <select
                    {...register('agePreference')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No preference</option>
                    <option value="infant">Infant (0-2)</option>
                    <option value="toddler">Toddler (2-5)</option>
                    <option value="child">Child (5-12)</option>
                    <option value="teen">Teen (13-17)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender Preference
                  </label>
                  <select
                    {...register('genderPreference')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No preference</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    {...register('specialNeedsExperience')}
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    I have experience working with children with special needs
                  </label>
                </div>

                <div className="flex items-start">
                  <input
                    {...register('transportationAvailable')}
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    I have reliable transportation available
                  </label>
                </div>
              </div>
            </div>

            {/* Legal Agreements */}
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Legal Agreements</h3>

              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    {...register('backgroundCheckConsent', { required: 'Background check consent is required' })}
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
                    {errors.backgroundCheckConsent && (
                      <p className="mt-1 text-sm text-red-600">{errors.backgroundCheckConsent.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    {...register('liabilityWaiver', { required: 'Liability waiver is required' })}
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
                    {errors.liabilityWaiver && (
                      <p className="mt-1 text-sm text-red-600">{errors.liabilityWaiver.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    {...register('confidentialityAgreement', { required: 'Confidentiality agreement is required' })}
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
                    {errors.confidentialityAgreement && (
                      <p className="mt-1 text-sm text-red-600">{errors.confidentialityAgreement.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full max-w-md bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-6 rounded-md font-semibold hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting Application...
                  </div>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
