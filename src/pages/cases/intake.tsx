import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';
import { FormService } from '@/services/formService';
import { 
  CASE_TYPES, 
  CASE_TYPE_LABELS, 
  CASE_PRIORITY, 
  CASE_PRIORITY_LABELS,
  PLACEMENT_TYPES,
  PLACEMENT_TYPE_LABELS 
} from '@/utils/constants';
import { useToast } from '@/components/common/Toast';

interface CaseIntakeFormData {
  // Child Information
  child_first_name: string;
  child_last_name: string;
  child_dob: string;
  child_gender?: string;
  child_ethnicity?: string;
  
  // Case Details
  case_number: string;
  case_type: string;
  case_priority: string;
  referral_date?: string;
  case_summary?: string;
  
  // Court Information
  court_jurisdiction?: string;
  assigned_judge?: string;
  courtroom?: string;
  
  // Placement Information
  current_placement?: string;
  placement_date?: string;
  placement_address?: string;
  placement_contact_person?: string;
  placement_phone?: string;
  
  // Volunteer Assignment
  assigned_volunteer?: string;
  assignment_date?: string;
  
  // Case Goals
  case_goals?: string;
}

interface VolunteerOption {
  id: string;
  name: string;
}

export default function CaseIntake() {
  const { user, loading } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([]);
  const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(true);
  const { showToast, showSuccessAnimation } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CaseIntakeFormData>();

  // Load volunteers from API
  useEffect(() => {
    const loadVolunteers = async () => {
      try {
        setIsLoadingVolunteers(true);
        const response = await apiClient.casaGet('volunteers');

        if (response.success && response.data) {
          const apiData = response.data as any;
          const rawList = (apiData?.data?.volunteers) || apiData?.volunteers || apiData?.data || apiData;
          const list: any[] = Array.isArray(rawList) ? rawList : [];

          const volunteerOptions = list
            // include active and in-progress statuses
            .filter((v: any) => {
              const status = (v.volunteer_status || v.status || '').toString().toLowerCase();
              return ['active', 'background_check', 'pending', 'onboarding'].includes(status) || status === '';
            })
            .map((v: any) => {
              const first = v.first_name || v.firstName || '';
              const last = v.last_name || v.lastName || '';
              const name = (first || last) ? `${first} ${last}`.trim() : (v.name || 'Unnamed Volunteer');
              return {
                id: v.user_id || v.id || v.userId || v.wp_user_id || name,
                name,
              } as VolunteerOption;
            });

          setVolunteers(volunteerOptions);
          if (volunteerOptions.length === 0) {
            // Fallback: pull from Formidable entries for Volunteer Registration
            try {
              const frm = await FormService.getFormData('VOLUNTEER_REGISTRATION');
              if (frm.success && frm.data) {
                const entries = (frm.data as any) || [];
                const ffOptions: VolunteerOption[] = Array.isArray(entries)
                  ? entries.map((e: any) => {
                      const meta = e?.item_meta || e?.meta || {};
                      const first = meta['69'] || meta['first_name'] || '';
                      const last = meta['70'] || meta['last_name'] || '';
                      const id = e?.user_id || e?.id || e?.item_id || `${first}-${last}`;
                      return { id: String(id), name: `${first} ${last}`.trim() };
                    }).filter((v: VolunteerOption) => v.name.length > 0)
                  : [];
                if (ffOptions.length > 0) {
                  setVolunteers(ffOptions);
                } else {
                  showToast({ type: 'info', title: 'No volunteers found', description: 'No selectable volunteers were found yet.' });
                }
              }
            } catch (ffErr) {
              console.warn('Formidable fallback for volunteers failed:', ffErr);
              showToast({ type: 'warning', title: 'Volunteer list unavailable', description: 'Unable to load volunteers from WordPress or Formidable.' });
            }
          }
        } else {
          setVolunteers([]);
        }
      } catch (error) {
        console.error('Failed to load volunteers:', error);
        showToast({ type: 'error', title: 'Failed to load volunteers', description: 'Could not fetch active volunteers.' });
        setVolunteers([]);
      } finally {
        setIsLoadingVolunteers(false);
      }
    };

    if (user) {
      loadVolunteers();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const onSubmit = async (data: CaseIntakeFormData) => {
    try {
      setIsSubmitting(true);

      // Submit to Formidable Forms first
      const formidableData = {
        case_number: data.case_number,
        child_first_name: data.child_first_name,
        child_last_name: data.child_last_name,
        child_dob: data.child_dob,
        child_gender: data.child_gender || '',
        child_ethnicity: data.child_ethnicity || '',
        case_type: data.case_type,
        case_priority: data.case_priority || 'medium',
        referral_date: data.referral_date || '',
        case_summary: data.case_summary || '',
        court_jurisdiction: data.court_jurisdiction || '',
        assigned_judge: data.assigned_judge || '',
        courtroom: data.courtroom || '',
        current_placement: data.current_placement || '',
        placement_date: data.placement_date || '',
        placement_address: data.placement_address || '',
        placement_contact_person: data.placement_contact_person || '',
        placement_phone: data.placement_phone || '',
        assigned_volunteer: data.assigned_volunteer || '',
        assignment_date: data.assignment_date || '',
        case_goals: data.case_goals || '',
      };

      // Submit to Formidable Forms (non-blocking - log errors but continue)
      try {
        await FormService.submitFormWithFallback('CASE_INTAKE', formidableData);
      } catch (ffError) {
        console.warn('Formidable Forms submission failed:', ffError);
      }

      // Submit to CASA API
      const caseData = {
        case_number: data.case_number,
        child_first_name: data.child_first_name,
        child_last_name: data.child_last_name,
        child_dob: data.child_dob,
        child_gender: data.child_gender || '',
        child_ethnicity: data.child_ethnicity || '',
        case_type: data.case_type,
        case_priority: data.case_priority || 'medium',
        referral_date: data.referral_date || '',
        case_summary: data.case_summary || '',
        court_jurisdiction: data.court_jurisdiction || '',
        assigned_judge: data.assigned_judge || '',
        courtroom: data.courtroom || '',
        current_placement: data.current_placement || '',
        placement_date: data.placement_date || '',
        placement_address: data.placement_address || '',
        placement_contact_person: data.placement_contact_person || '',
        placement_phone: data.placement_phone || '',
        assigned_volunteer: data.assigned_volunteer || '',
        assignment_date: data.assignment_date || '',
        case_goals: data.case_goals || '',
        case_status: 'active',
        created_by: user?.id || '',
        organization_id: user?.organizationId || '',
      };

      // Submit to CASA API
      const response = await apiClient.casaPost('cases', caseData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create case');
      }

      const result = response.data;
      console.log('Case created successfully:', result);

      // Show success animation
      showSuccessAnimation();

      setSubmitSuccess(true);
      reset();

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);

    } catch (error: any) {
      console.error('Failed to submit case:', error);
      showToast({ type: 'error', title: 'Case creation failed', description: error?.message || 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    const formData = watch();
    localStorage.setItem('case_intake_draft', JSON.stringify(formData));
    alert('Draft saved successfully!');
  };

  return (
    <>
      <Head>
        <title>Case Intake - CASA Case Management System</title>
        <meta name="description" content="Create a new CASA case intake record" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation currentPage="/cases/intake" />
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-700 dark:to-purple-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">CASA Case Management System</h1>
              <p className="text-blue-100 text-lg">Comprehensive Case Tracking & Volunteer Management</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-fintech-bg-secondary shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link
                href="/dashboard"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 font-medium text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/cases"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 font-medium text-sm"
              >
                All Cases
              </Link>
              <Link
                href="/cases/intake"
                className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
              >
                Case Intake
              </Link>
              <Link
                href="/contacts/log"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 font-medium text-sm"
              >
                Contact Log
              </Link>
              <Link
                href="/court-hearings"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 font-medium text-sm"
              >
                Court Hearings
              </Link>
              <Link
                href="/documents"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 font-medium text-sm"
              >
                Documents
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
                    Case Created Successfully!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    The case has been added to the system and is now available for volunteer assignment.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Child Information */}
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                📋 Child Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('child_first_name', { required: 'First name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.child_first_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  />
                  {errors.child_first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.child_first_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('child_last_name', { required: 'Last name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.child_last_name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  />
                  {errors.child_last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.child_last_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('child_dob', { required: 'Date of birth is required' })}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.child_dob ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  />
                  {errors.child_dob && (
                    <p className="mt-1 text-sm text-red-600">{errors.child_dob.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gender
                  </label>
                  <select
                    {...register('child_gender')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unknown">Prefer not to answer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ethnicity
                  </label>
                  <input
                    {...register('child_ethnicity')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Case Details */}
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                📋 Case Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Case Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('case_number', { required: 'Case number is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.case_number ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                    placeholder="e.g., 2024-001"
                  />
                  {errors.case_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.case_number.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Case Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('case_type', { required: 'Case type is required' })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.case_type ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  >
                    <option value="">Select Case Type</option>
                    {Object.entries(CASE_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  {errors.case_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.case_type.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    {...register('case_priority')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="medium"
                  >
                    {Object.entries(CASE_PRIORITY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Referral Date
                  </label>
                  <input
                    {...register('referral_date')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Case Summary
                </label>
                <textarea
                  {...register('case_summary')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide a brief summary of the case circumstances..."
                />
              </div>
            </div>

            {/* Court Information */}
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                ⚖️ Court Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Court Jurisdiction
                  </label>
                  <select
                    {...register('court_jurisdiction')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Jurisdiction</option>
                    <option value="family-court">Family Court</option>
                    <option value="juvenile-court">Juvenile Court</option>
                    <option value="district-court">District Court</option>
                    <option value="superior-court">Superior Court</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Judge
                  </label>
                  <input
                    {...register('assigned_judge')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Judge Name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Courtroom
                  </label>
                  <input
                    {...register('courtroom')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Courtroom Number"
                  />
                </div>
              </div>
            </div>

            {/* Placement Information */}
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                🏠 Placement Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Placement
                  </label>
                  <select
                    {...register('current_placement')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Placement</option>
                    {Object.entries(PLACEMENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Placement Date
                  </label>
                  <input
                    {...register('placement_date')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    {...register('placement_contact_person')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Foster parent, guardian, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    {...register('placement_phone')}
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Placement Address
                </label>
                <textarea
                  {...register('placement_address')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current placement address..."
                />
              </div>
            </div>

            {/* Volunteer Assignment */}
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                👥 Volunteer Assignment
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Volunteer
                  </label>
                  <select
                    {...register('assigned_volunteer')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoadingVolunteers}
                  >
                    <option value="">
                      {isLoadingVolunteers ? 'Loading volunteers...' : 'Select Volunteer (Optional)'}
                    </option>
                    {volunteers.map((volunteer) => (
                      <option key={volunteer.id} value={volunteer.id}>{volunteer.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assignment Date
                  </label>
                  <input
                    {...register('assignment_date')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Case Goals */}
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                🎯 Case Goals
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Initial Case Goals
                </label>
                <textarea
                  {...register('case_goals')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What are the primary goals for this case? (e.g., permanency planning, family reunification, safety assessment)"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 max-w-xs bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-6 rounded-md font-semibold hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Case...
                  </div>
                ) : (
                  'Create Case'
                )}
              </button>
              
              <button
                type="button"
                onClick={handleSaveDraft}
                className="bg-gray-500 text-white py-3 px-6 rounded-md font-semibold hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
              >
                Save as Draft
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}