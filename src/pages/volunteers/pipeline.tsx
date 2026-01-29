import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useAuth';
import { volunteerService } from '@/services/volunteerService';
import { Volunteer, PipelineActionRequest, CasaOrganization } from '@/types';
import { useToast } from '@/components/common/Toast';
import PipelineColumn from '@/components/volunteers/PipelineColumn';
import Cookies from 'js-cookie';

interface PipelineData {
  applied: Volunteer[];
  background_check: Volunteer[];
  training: Volunteer[];
  active: Volunteer[];
  rejected: Volunteer[];
}

export default function VolunteerPipeline() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();

  const [pipelineData, setPipelineData] = useState<PipelineData>({
    applied: [],
    background_check: [],
    training: [],
    active: [],
    rejected: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingVolunteerId, setLoadingVolunteerId] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<{ volunteerId: string; action: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    name: string;
    username: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [applicationUrl, setApplicationUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Get organization info for the application URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Organization is stored under 'organization_id' key (but contains full org object)
        const orgData = Cookies.get('organization_id');
        if (orgData) {
          const org = JSON.parse(orgData) as CasaOrganization;
          const baseUrl = window.location.origin;
          setApplicationUrl(`${baseUrl}/apply?org=${org.slug}`);
        }
      } catch (e) {
        console.error('Failed to parse organization data:', e);
      }
    }
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(applicationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast({
        type: 'success',
        title: 'Copied!',
        description: 'Application link copied to clipboard',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to copy',
        description: 'Please copy the link manually',
      });
    }
  };

  const fetchPipelineData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await volunteerService.getVolunteersByPipeline();

      if (response.success && response.data) {
        setPipelineData(response.data);
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load pipeline',
          description: response.error,
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error',
        description: error.message || 'Failed to load pipeline data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user) {
      fetchPipelineData();
    }
  }, [user, fetchPipelineData]);

  const handleAction = async (volunteerId: string, action: string) => {
    // If action requires rejection reason, show modal
    if (action === 'reject_application' || action === 'fail_background_check') {
      setPendingRejection({ volunteerId, action });
      setRejectionReason('');
      setShowRejectionModal(true);
      return;
    }

    await executeAction(volunteerId, action);
  };

  const executeAction = async (volunteerId: string, action: string, reason?: string) => {
    try {
      setLoadingVolunteerId(volunteerId);

      const response = await volunteerService.updatePipelineStatus(
        volunteerId,
        action as PipelineActionRequest['action'],
        undefined,
        reason
      );

      if (response.success && response.data) {
        showToast({
          type: 'success',
          title: 'Success',
          description: response.data.action === 'approve_volunteer'
            ? 'Volunteer approved and account created!'
            : `Action "${action.replace(/_/g, ' ')}" completed successfully`,
        });

        // If account was created, show credentials
        if (response.data.userCreated) {
          const volunteer = [...pipelineData.applied, ...pipelineData.background_check, ...pipelineData.training]
            .find(v => v.id === volunteerId);

          setNewCredentials({
            name: volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Volunteer',
            username: response.data.username || '',
            password: response.data.temporaryPassword || '',
            emailSent: response.data.welcomeEmailSent || false,
          });
          setShowCredentialsModal(true);
        }

        // Refresh pipeline data
        await fetchPipelineData();
      } else {
        showToast({
          type: 'error',
          title: 'Action failed',
          description: response.error,
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error',
        description: error.message || 'Failed to execute action',
      });
    } finally {
      setLoadingVolunteerId(null);
    }
  };

  const handleRejectionConfirm = async () => {
    if (!pendingRejection) return;

    setShowRejectionModal(false);
    await executeAction(pendingRejection.volunteerId, pendingRejection.action, rejectionReason);
    setPendingRejection(null);
    setRejectionReason('');
  };

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'applied':
        return [
          { action: 'start_background_check', label: 'Start BG Check', variant: 'primary' as const },
          { action: 'reject_application', label: 'Reject', variant: 'danger' as const },
        ];
      case 'background_check':
        return [
          { action: 'approve_background_check', label: 'Approve BG', variant: 'primary' as const },
          { action: 'fail_background_check', label: 'Fail BG', variant: 'danger' as const },
        ];
      case 'training':
        return [
          { action: 'complete_training', label: 'Complete Training', variant: 'secondary' as const },
          { action: 'approve_volunteer', label: 'Approve & Activate', variant: 'primary' as const },
        ];
      case 'active':
        return []; // Active volunteers are managed elsewhere
      case 'rejected':
        return []; // No actions for rejected
      default:
        return [];
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Volunteer Pipeline - CASA</title>
      </Head>

      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-light">Volunteer Pipeline</h1>
                  <p className="text-green-100">Manage volunteer applications and onboarding</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-white text-green-700 hover:bg-green-50 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Application
                  </button>
                  <Link
                    href="/volunteers/list"
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors"
                  >
                    View All Volunteers
                  </Link>
                  <button
                    onClick={fetchPipelineData}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link
                href="/dashboard"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/volunteers/pipeline"
                className="py-4 px-1 border-b-2 border-green-500 text-green-600 font-medium text-sm"
              >
                Pipeline
              </Link>
              <Link
                href="/volunteers/list"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                All Volunteers
              </Link>
            </nav>
          </div>
        </div>

        {/* Pipeline Board */}
        <div className="p-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="flex gap-4 min-w-max">
              <PipelineColumn
                title="Applied"
                status="applied"
                volunteers={pipelineData.applied}
                color="blue"
                onAction={handleAction}
                loadingVolunteerId={loadingVolunteerId}
                getAvailableActions={getAvailableActions}
              />
              <PipelineColumn
                title="Background Check"
                status="background_check"
                volunteers={pipelineData.background_check}
                color="yellow"
                onAction={handleAction}
                loadingVolunteerId={loadingVolunteerId}
                getAvailableActions={getAvailableActions}
              />
              <PipelineColumn
                title="Training"
                status="training"
                volunteers={pipelineData.training}
                color="purple"
                onAction={handleAction}
                loadingVolunteerId={loadingVolunteerId}
                getAvailableActions={getAvailableActions}
              />
              <PipelineColumn
                title="Active"
                status="active"
                volunteers={pipelineData.active}
                color="green"
                onAction={handleAction}
                loadingVolunteerId={loadingVolunteerId}
                getAvailableActions={getAvailableActions}
              />
              <PipelineColumn
                title="Rejected"
                status="rejected"
                volunteers={pipelineData.rejected}
                color="red"
                onAction={handleAction}
                loadingVolunteerId={loadingVolunteerId}
                getAvailableActions={getAvailableActions}
              />
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Pipeline Summary</h3>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{pipelineData.applied.length}</p>
                <p className="text-xs text-gray-500">Applied</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{pipelineData.background_check.length}</p>
                <p className="text-xs text-gray-500">Background Check</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{pipelineData.training.length}</p>
                <p className="text-xs text-gray-500">Training</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{pipelineData.active.length}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{pipelineData.rejected.length}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {pendingRejection?.action === 'fail_background_check'
                ? 'Background Check Failed'
                : 'Reject Application'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for this action:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter reason..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setPendingRejection(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectionConfirm}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && newCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Account Created!
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {newCredentials.name}&apos;s volunteer account has been created
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Username</label>
                  <p className="font-mono text-sm bg-white px-2 py-1 rounded border">
                    {newCredentials.username}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Temporary Password</label>
                  <p className="font-mono text-sm bg-white px-2 py-1 rounded border">
                    {newCredentials.password}
                  </p>
                </div>
              </div>
            </div>

            {newCredentials.emailSent ? (
              <p className="text-sm text-green-600 text-center mb-4">
                Welcome email with credentials sent to the volunteer.
              </p>
            ) : (
              <p className="text-sm text-yellow-600 text-center mb-4">
                Please share these credentials with the volunteer manually.
              </p>
            )}

            <button
              onClick={() => {
                setShowCredentialsModal(false);
                setNewCredentials(null);
              }}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Share Application Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Share Volunteer Application
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Share this link with potential volunteers. They can fill out the application form without needing an account.
            </p>

            {applicationUrl ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={applicationUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-500 mb-3">Share via:</p>
                  <div className="flex gap-3">
                    <a
                      href={`mailto:?subject=Volunteer Application&body=Apply to become a CASA volunteer: ${encodeURIComponent(applicationUrl)}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(applicationUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=Become a CASA volunteer!&url=${encodeURIComponent(applicationUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>Unable to generate application link.</p>
                <p className="text-sm">Organization information not available.</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
