import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';
import { useToast } from '@/components/common/Toast';

interface HearingFormData {
  case_number: string;
  hearing_date: string;
  hearing_time: string;
  hearing_type: string;
  court_room: string;
  judge_name: string;
  notes: string;
}

interface CaseOption {
  id: string;
  case_number: string;
  child_name: string;
}

interface CourtHearing {
  id: string;
  case_number: string;
  child_name: string;
  hearing_date: string;
  hearing_time: string;
  hearing_type: string;
  court_room: string;
  judge_name: string;
  status: string;
  notes: string;
}

const hearingTypes = [
  { value: 'initial', label: 'Initial Hearing' },
  { value: 'review', label: 'Review Hearing' },
  { value: 'permanency', label: 'Permanency Hearing' },
  { value: 'termination', label: 'Termination Hearing' },
  { value: 'adoption', label: 'Adoption Hearing' },
  { value: 'status', label: 'Status Conference' },
  { value: 'emergency', label: 'Emergency Hearing' },
  { value: 'other', label: 'Other' },
];

export default function CourtHearings() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const { showToast, showSuccessAnimation } = useToast();

  const [cases, setCases] = useState<CaseOption[]>([]);
  const [hearings, setHearings] = useState<CourtHearing[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isLoadingHearings, setIsLoadingHearings] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<HearingFormData>();

  // Load cases from API
  useEffect(() => {
    const loadCases = async () => {
      try {
        setIsLoadingCases(true);
        const response = await apiClient.casaGet('cases?limit=100');
        if (response.success && response.data) {
          const apiData = response.data as any;
          let casesData: any[] = [];

          if (apiData.success && apiData.data?.cases) {
            casesData = apiData.data.cases;
          } else if (apiData.data?.cases) {
            casesData = apiData.data.cases;
          } else if (apiData.cases) {
            casesData = apiData.cases;
          } else if (Array.isArray(apiData.data)) {
            casesData = apiData.data;
          } else if (Array.isArray(apiData)) {
            casesData = apiData;
          }

          setCases(casesData.map((c: any) => ({
            id: c.id,
            case_number: c.case_number,
            child_name: `${c.child_first_name || ''} ${c.child_last_name || ''}`.trim() || 'Unknown'
          })));
        }
      } catch (error) {
        console.error('Failed to load cases:', error);
      } finally {
        setIsLoadingCases(false);
      }
    };

    if (user) {
      loadCases();
    }
  }, [user]);

  // Load hearings from API
  useEffect(() => {
    const loadHearings = async () => {
      try {
        setIsLoadingHearings(true);
        const response = await apiClient.casaGet('court-hearings');
        if (response.success && response.data) {
          const apiData = response.data as any;
          let hearingsData: any[] = [];

          if (apiData.success && apiData.data?.hearings) {
            hearingsData = apiData.data.hearings;
          } else if (apiData.data?.hearings) {
            hearingsData = apiData.data.hearings;
          } else if (apiData.hearings) {
            hearingsData = apiData.hearings;
          } else if (Array.isArray(apiData.data)) {
            hearingsData = apiData.data;
          } else if (Array.isArray(apiData)) {
            hearingsData = apiData;
          }

          setHearings(hearingsData);
        }
      } catch (error) {
        console.error('Failed to load hearings:', error);
      } finally {
        setIsLoadingHearings(false);
      }
    };

    if (user) {
      loadHearings();
    }
  }, [user]);

  // Handle case pre-selection from URL
  useEffect(() => {
    if (router.query.case && cases.length > 0) {
      const caseNumber = router.query.case as string;
      setValue('case_number', caseNumber);
      // Auto-open the modal if coming from a case page
      setShowScheduleModal(true);
    }
  }, [router.query.case, cases, setValue]);

  const onSubmit = async (data: HearingFormData) => {
    try {
      setIsSubmitting(true);

      const response = await apiClient.casaPost('court-hearings', {
        case_number: data.case_number,
        hearing_date: data.hearing_date,
        hearing_time: data.hearing_time,
        hearing_type: data.hearing_type,
        court_room: data.court_room || '',
        judge_name: data.judge_name || '',
        notes: data.notes || '',
      });

      if (response.success) {
        showSuccessAnimation();
        showToast({ type: 'success', title: 'Success', description: 'Court hearing scheduled successfully!' });
        reset();
        setShowScheduleModal(false);

        // Refresh hearings list
        const refreshResponse = await apiClient.casaGet('court-hearings');
        if (refreshResponse.success && refreshResponse.data) {
          const apiData = refreshResponse.data as any;
          if (apiData.success && apiData.data?.hearings) {
            setHearings(apiData.data.hearings);
          }
        }
      } else {
        throw new Error(response.error || 'Failed to schedule hearing');
      }
    } catch (error: any) {
      console.error('Failed to schedule hearing:', error);
      showToast({ type: 'error', title: 'Error', description: error.message || 'Failed to schedule hearing' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoadingCases) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation currentPage="/court-hearings" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Court Hearings - CASA</title>
        <meta name="description" content="Manage court hearings" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation currentPage="/court-hearings" />

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 dark:from-purple-800 dark:to-indigo-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Court Hearings</h1>
                  <p className="text-purple-100 text-lg">Schedule and manage court hearings</p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors shadow-lg"
                >
                  Schedule Hearing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl p-6 shadow-sm dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-fintech-text-tertiary">Total Hearings</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-fintech-text-primary">{hearings.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl p-6 shadow-sm dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-fintech-text-tertiary">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-fintech-text-primary">
                    {hearings.filter(h => h.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl p-6 shadow-sm dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-fintech-text-tertiary">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-fintech-text-primary">
                    {hearings.filter(h => {
                      const hearingDate = new Date(h.hearing_date);
                      const today = new Date();
                      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return hearingDate >= today && hearingDate <= weekFromNow;
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hearings List */}
          <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-sm dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-fintech-border-subtle">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-fintech-text-primary">Upcoming Hearings</h2>
            </div>

            {isLoadingHearings ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : hearings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-fintech-text-secondary mb-4">No court hearings scheduled</p>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="text-purple-600 dark:text-purple-400 font-medium hover:underline"
                >
                  Schedule your first hearing
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                {hearings.map((hearing) => (
                  <div key={hearing.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-fintech-text-primary">
                            {hearing.child_name || 'Unknown'}
                          </h3>
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                            {hearing.hearing_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-fintech-text-tertiary">
                          <span>Case: {hearing.case_number}</span>
                          <span>Date: {new Date(hearing.hearing_date).toLocaleDateString()}</span>
                          <span>Time: {hearing.hearing_time || 'TBD'}</span>
                          {hearing.court_room && <span>Room: {hearing.court_room}</span>}
                        </div>
                      </div>
                      <Link
                        href={`/cases/${hearing.case_id || hearing.id}`}
                        className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      >
                        View Case
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-2xl bg-white dark:bg-fintech-bg-secondary border border-gray-200 dark:border-fintech-border-subtle">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-fintech-text-primary">Schedule Court Hearing</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-fintech-text-primary hover:bg-gray-100 dark:hover:bg-fintech-bg-tertiary rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                  Case <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('case_number', { required: 'Case is required' })}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.case_number ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-fintech-border-subtle'
                  }`}
                >
                  <option value="">Select Case</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.case_number}>
                      {c.case_number} - {c.child_name}
                    </option>
                  ))}
                </select>
                {errors.case_number && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.case_number.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                    Hearing Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('hearing_date', { required: 'Hearing date is required' })}
                    className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.hearing_date ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-fintech-border-subtle'
                    }`}
                  />
                  {errors.hearing_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hearing_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                    Hearing Time
                  </label>
                  <input
                    type="time"
                    {...register('hearing_time')}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                  Hearing Type <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('hearing_type', { required: 'Hearing type is required' })}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.hearing_type ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-fintech-border-subtle'
                  }`}
                >
                  <option value="">Select Type</option>
                  {hearingTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.hearing_type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hearing_type.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                    Court Room
                  </label>
                  <input
                    type="text"
                    {...register('court_room')}
                    placeholder="e.g., Courtroom A"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                    Judge Name
                  </label>
                  <input
                    type="text"
                    {...register('judge_name')}
                    placeholder="e.g., Judge Smith"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-fintech-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Additional notes about the hearing..."
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-fintech-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle text-gray-700 dark:text-fintech-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Scheduling...' : 'Schedule Hearing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
