import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';
import { FormService } from '@/services/formService';
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from '@/utils/constants';

interface ContactLogFormData {
  // Case Information
  case_number: string;
  child_name: string;
  
  // Contact Details
  contact_type: string;
  contact_date: string;
  contact_time?: string;
  duration_minutes?: number;
  
  // Location & Participants
  location?: string;
  participants?: string;
  
  // Contact Information
  purpose?: string;
  summary: string;
  observations?: string;
  concerns?: string;
  
  // Follow-up
  follow_up_required?: boolean;
  follow_up_notes?: string;
  next_contact_date?: string;
  
  // Additional Info
  mileage?: number;
  expenses?: number;
  attachments?: string;
}

const mockCases = [
  { id: 'case-1', number: '2024-001', childName: 'Emily Johnson' },
  { id: 'case-2', number: '2024-002', childName: 'Michael Davis' },
  { id: 'case-3', number: '2024-003', childName: 'Sarah Martinez' },
  { id: 'case-4', number: '2024-004', childName: 'David Wilson' },
];

export default function ContactLog() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ContactLogFormData>();

  // Handle case pre-selection from URL
  useEffect(() => {
    if (router.query.case) {
      const caseNumber = router.query.case as string;
      const selectedCase = mockCases.find(c => c.number === caseNumber);
      if (selectedCase) {
        setValue('case_number', selectedCase.number);
        setValue('child_name', selectedCase.childName);
      }
    }
  }, [router.query.case, setValue]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const onSubmit = async (data: ContactLogFormData) => {
    try {
      setIsSubmitting(true);
      
      // Submit to Formidable Forms - Contact Log
      const formidableData = {
        case_id: data.case_number,
        contact_date: data.contact_date,
        contact_type: data.contact_type,
        contact_person: data.child_name,
        contact_method: data.location || '',
        contact_summary: data.summary,
        follow_up_required: data.follow_up_required || false,
        follow_up_date: data.next_contact_date || '',
        follow_up_notes: data.follow_up_notes || ''
      };

      const formResponse = await FormService.submitFormWithFallback('CONTACT_LOG', formidableData);
      
      if (!formResponse.success) {
        throw new Error(formResponse.error || 'Failed to submit contact log form');
      }

      // Also create contact log in WordPress for compatibility
      const contactData = {
        title: `Contact Log - ${data.case_number} - ${data.contact_date}`,
        status: 'publish',
        meta: {
          case_number: data.case_number,
          child_name: data.child_name,
          contact_type: data.contact_type,
          contact_date: data.contact_date,
          contact_time: data.contact_time || '',
          duration_minutes: data.duration_minutes || 0,
          location: data.location || '',
          participants: data.participants || '',
          purpose: data.purpose || '',
          summary: data.summary,
          observations: data.observations || '',
          concerns: data.concerns || '',
          follow_up_required: data.follow_up_required || false,
          follow_up_notes: data.follow_up_notes || '',
          next_contact_date: data.next_contact_date || '',
          mileage: data.mileage || 0,
          expenses: data.expenses || 0,
          attachments: data.attachments || '',
          volunteer_id: user?.id || '',
          organization_id: user?.organizationId || '',
          created_at: new Date().toISOString(),
        }
      };

      // Submit to WordPress API using authenticated client
      const response = await apiClient.casaPost('contact-logs', contactData.meta);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create contact log');
      }

      const result = response.data;
      console.log('Contact log created successfully:', result);
      
      setSubmitSuccess(true);
      reset();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
      
    } catch (error) {
      console.error('Failed to submit contact log:', error);
      alert('Failed to create contact log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    const formData = watch();
    localStorage.setItem('contact_log_draft', JSON.stringify(formData));
    alert('Draft saved successfully!');
  };

  return (
    <>
      <Head>
        <title>Contact Log - CASA Case Management System</title>
        <meta name="description" content="Log contact interactions with children and families" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage="/contacts/log" />
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">CASA Contact Log</h1>
              <p className="text-green-100 text-lg">Document interactions with children and families</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
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
                href="/cases/intake"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Case Intake
              </Link>
              <Link
                href="/contacts/log"
                className="py-4 px-1 border-b-2 border-green-500 text-green-600 font-medium text-sm"
              >
                Contact Log
              </Link>
              <Link
                href="/contacts/history"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Contact History
              </Link>
              <Link
                href="/documents"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
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
                    Contact Log Saved Successfully!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    The contact interaction has been documented and is now part of the case record.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Case Selection */}
            <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                📋 Case Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('case_number', { required: 'Case number is required' })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.case_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Case</option>
                    {mockCases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.number}>
                        {caseItem.number} - {caseItem.childName}
                      </option>
                    ))}
                  </select>
                  {errors.case_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.case_number.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Child Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('child_name', { required: 'Child name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.child_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Child's name"
                  />
                  {errors.child_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.child_name.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                📞 Contact Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('contact_type', { required: 'Contact type is required' })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.contact_type ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Type</option>
                    {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  {errors.contact_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.contact_type.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('contact_date', { required: 'Contact date is required' })}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.contact_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.contact_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.contact_date.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Time
                  </label>
                  <input
                    {...register('contact_time')}
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    {...register('duration_minutes', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 60"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    {...register('location')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Child's home, school, court"
                  />
                </div>
              </div>
            </div>

            {/* Participants & Purpose */}
            <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                👥 Participants & Purpose
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Participants Present
                  </label>
                  <input
                    {...register('participants')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Child, foster parent, social worker"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose of Contact
                  </label>
                  <input
                    {...register('purpose')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Monthly visit, check on well-being"
                  />
                </div>
              </div>
            </div>

            {/* Contact Summary */}
            <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                📝 Contact Summary
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('summary', { required: 'Contact summary is required' })}
                    rows={5}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.summary ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Describe the contact interaction, what was discussed, child's demeanor, etc."
                  />
                  {errors.summary && (
                    <p className="mt-1 text-sm text-red-600">{errors.summary.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observations
                  </label>
                  <textarea
                    {...register('observations')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Observations about the child's behavior, environment, relationships, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concerns or Issues
                  </label>
                  <textarea
                    {...register('concerns')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Any concerns, safety issues, or items that need follow-up"
                  />
                </div>
              </div>
            </div>

            {/* Follow-up */}
            <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                🔄 Follow-up Actions
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    {...register('follow_up_required')}
                    type="checkbox"
                    id="follow_up_required"
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="follow_up_required" className="ml-2 block text-sm text-gray-900">
                    Follow-up action required
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Notes
                  </label>
                  <textarea
                    {...register('follow_up_notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="What follow-up actions are needed?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Contact Date
                  </label>
                  <input
                    {...register('next_contact_date')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Expenses & Mileage */}
            <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                💰 Expenses & Mileage
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mileage
                  </label>
                  <input
                    {...register('mileage', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Miles driven"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Expenses
                  </label>
                  <input
                    {...register('expenses', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="$0.00"
                  />
                </div>
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
                    Saving Contact Log...
                  </div>
                ) : (
                  'Save Contact Log'
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