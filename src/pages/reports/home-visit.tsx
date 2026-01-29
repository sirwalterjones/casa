import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/common/Toast';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';
import { FormService } from '@/services/formService';
import { REPORT_TYPES } from '@/utils/constants';

interface HomeVisitReportData {
  // Visit Details
  case_id: string;
  volunteer_id: string;
  visit_date: string;
  visit_duration: number;
  location: string;
  attendees: string;
  
  // Observations
  observations: string;
  child_wellbeing: string;
  placement_stability: string;
  safety_concerns: string;
  
  // Assessment
  educational_progress?: string;
  social_development?: string;
  emotional_wellbeing?: string;
  physical_health?: string;
  
  // Recommendations
  recommendations: string;
  follow_up_required: boolean;
  follow_up_notes?: string;
  
  // Status
  status: string;
}

interface Case {
  id: string;
  case_number: string;
  child_first_name: string;
  child_last_name: string;
}

interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
}

export default function HomeVisitReport() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const { showToast, showSuccessAnimation } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<HomeVisitReportData>({
    defaultValues: {
      follow_up_required: false,
      status: 'draft',
      visit_duration: 60,
    }
  });

  const followUpRequired = watch('follow_up_required');

  useEffect(() => {
    if (user) {
      fetchCases();
      fetchVolunteers();
    }
  }, [user]);

  // Handle case pre-selection from URL
  useEffect(() => {
    if (router.query.case && cases.length > 0) {
      const caseNumber = router.query.case as string;
      const selectedCase = cases.find(c => c.case_number === caseNumber);
      if (selectedCase) {
        setValue('case_id', selectedCase.id);
      }
    }
  }, [router.query.case, cases, setValue]);

  const fetchCases = async () => {
    try {
      const response = await apiClient.casaGet<any>('cases?status=active');
      if (response.success && response.data) {
        const casesData = response.data as any;
        if (casesData.success && casesData.data?.cases) {
          setCases(casesData.data.cases);
        } else if (Array.isArray(casesData.data)) {
          setCases(casesData.data);
        } else if (Array.isArray(casesData)) {
          setCases(casesData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    }
  };

  const fetchVolunteers = async () => {
    try {
      const response = await apiClient.casaGet<any>('volunteers?status=active');
      if (response.success && response.data) {
        const volunteersData = response.data as any;
        if (volunteersData.success && volunteersData.data?.volunteers) {
          setVolunteers(volunteersData.data.volunteers);
        } else if (Array.isArray(volunteersData.data)) {
          setVolunteers(volunteersData.data);
        } else if (Array.isArray(volunteersData)) {
          setVolunteers(volunteersData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch volunteers:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const onSubmit = async (data: HomeVisitReportData) => {
    try {
      setIsSubmitting(true);

      // Submit to Formidable Forms first
      const formidableData = {
        case_id: data.case_id,
        visit_date: data.visit_date,
        visit_type: 'home_visit',
        child_present: 'yes',
        child_condition: data.child_wellbeing,
        placement_condition: data.placement_stability,
        safety_assessment: data.safety_concerns,
        concerns_identified: data.safety_concerns,
        recommendations: data.recommendations,
        next_visit_date: '',
        volunteer_notes: data.observations,
      };

      // Submit to Formidable Forms (non-blocking - log errors but continue)
      try {
        await FormService.submitFormWithFallback('HOME_VISIT_REPORT', formidableData);
      } catch (ffError) {
        console.warn('Formidable Forms submission failed:', ffError);
      }

      // Submit to CASA API
      const reportData = {
        case_id: parseInt(data.case_id),
        volunteer_id: parseInt(data.volunteer_id),
        report_type: REPORT_TYPES.HOME_VISIT,
        visit_date: data.visit_date,
        visit_duration: data.visit_duration,
        location: data.location,
        attendees: data.attendees,
        observations: data.observations,
        child_wellbeing: data.child_wellbeing,
        placement_stability: data.placement_stability,
        safety_concerns: data.safety_concerns,
        recommendations: data.recommendations,
        follow_up_required: data.follow_up_required,
        follow_up_notes: data.follow_up_notes || '',
        status: data.status,
        educational_progress: data.educational_progress || '',
        social_development: data.social_development || '',
        emotional_wellbeing: data.emotional_wellbeing || '',
        physical_health: data.physical_health || '',
      };

      const response = await apiClient.casaPost('reports', reportData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create report');
      }

      console.log('Report created successfully:', response.data);

      // Show success animation
      showSuccessAnimation();

      setSubmitSuccess(true);
      reset();

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);

    } catch (error: any) {
      console.error('Failed to submit report:', error);
      showToast({ type: 'error', title: 'Report submission failed', description: error?.message || 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Home Visit Report - CASA Case Management System</title>
        <meta name="description" content="Submit a home visit report" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Home Visit Report</h1>
              <p className="text-purple-100 text-lg">Document your visit and observations</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link
                href="/dashboard"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 font-medium text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/reports/home-visit"
                className="py-4 px-1 border-b-2 border-purple-500 text-purple-600 font-medium text-sm"
              >
                Home Visit Report
              </Link>
              <Link
                href="/reports"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 font-medium text-sm"
              >
                All Reports
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
                    Report Submitted Successfully!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your home visit report has been saved and is available for supervisor review.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Visit Details */}
            <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                📅 Visit Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Case <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('case_id', { required: 'Case selection is required' })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.case_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  >
                    <option value="">Select Case</option>
                    {cases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} - {caseItem.child_first_name} {caseItem.child_last_name}
                      </option>
                    ))}
                  </select>
                  {errors.case_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.case_id.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Volunteer <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('volunteer_id', { required: 'Volunteer selection is required' })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.volunteer_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  >
                    <option value="">Select Volunteer</option>
                    {volunteers.map((volunteer) => (
                      <option key={volunteer.id} value={volunteer.id}>
                        {volunteer.first_name} {volunteer.last_name}
                      </option>
                    ))}
                  </select>
                  {errors.volunteer_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.volunteer_id.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Visit Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('visit_date', { required: 'Visit date is required' })}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.visit_date ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                  />
                  {errors.visit_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.visit_date.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    {...register('visit_duration', { min: 1 })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="60"
                  />
                </div>

                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('location', { required: 'Location is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.location ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                    placeholder="Home, School, etc."
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attendees Present
                </label>
                <textarea
                  {...register('attendees')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="List who was present during the visit (child, foster parents, siblings, etc.)"
                />
              </div>
            </div>

            {/* Observations */}
            <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                👁️ Observations
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    General Observations <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('observations', { required: 'General observations are required' })}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.observations ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                    placeholder="Describe what you observed during the visit..."
                  />
                  {errors.observations && (
                    <p className="mt-1 text-sm text-red-600">{errors.observations.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Child's Wellbeing
                  </label>
                  <textarea
                    {...register('child_wellbeing')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="How is the child doing physically, emotionally, and mentally?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Placement Stability
                  </label>
                  <textarea
                    {...register('placement_stability')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="How stable does the current placement seem?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Safety Concerns
                  </label>
                  <textarea
                    {...register('safety_concerns')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Note any safety concerns or issues observed"
                  />
                </div>
              </div>
            </div>

            {/* Detailed Assessment */}
            <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                📊 Detailed Assessment
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Educational Progress
                  </label>
                  <textarea
                    {...register('educational_progress')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="How is the child doing in school?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Social Development
                  </label>
                  <textarea
                    {...register('social_development')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Social interactions and relationships"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Emotional Wellbeing
                  </label>
                  <textarea
                    {...register('emotional_wellbeing')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Emotional state and mental health"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Physical Health
                  </label>
                  <textarea
                    {...register('physical_health')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Physical health and medical needs"
                  />
                </div>
              </div>
            </div>

            {/* Recommendations & Follow-up */}
            <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                💡 Recommendations & Follow-up
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recommendations <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('recommendations', { required: 'Recommendations are required' })}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.recommendations ? 'border-red-300' : 'border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white'
                    }`}
                    placeholder="What recommendations do you have based on this visit?"
                  />
                  {errors.recommendations && (
                    <p className="mt-1 text-sm text-red-600">{errors.recommendations.message}</p>
                  )}
                </div>
                
                <div className="flex items-start">
                  <input
                    {...register('follow_up_required')}
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded"
                  />
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Follow-up Required
                    </label>
                    <p className="text-sm text-gray-600">
                      Check if this case requires immediate follow-up attention
                    </p>
                  </div>
                </div>
                
                {followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Follow-up Notes
                    </label>
                    <textarea
                      {...register('follow_up_notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Describe what follow-up actions are needed and when"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Report Status */}
            <div className="bg-white dark:bg-fintech-bg-card p-6 rounded-lg shadow-md border-l-4 border-gray-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                📋 Report Status
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-fintech-bg-secondary dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="draft">Save as Draft</option>
                  <option value="submitted">Submit for Review</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 max-w-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-md font-semibold hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Report...
                  </div>
                ) : (
                  'Submit Home Visit Report'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
