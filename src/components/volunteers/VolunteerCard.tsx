import { useState } from 'react';
import { Volunteer } from '@/types';
import { VOLUNTEER_STATUS_LABELS } from '@/utils/constants';

interface VolunteerCardProps {
  volunteer: Volunteer;
  onAction: (action: string) => void;
  availableActions: { action: string; label: string; variant: 'primary' | 'danger' | 'secondary' }[];
  isLoading?: boolean;
}

export default function VolunteerCard({
  volunteer,
  onAction,
  availableActions,
  isLoading = false,
}: VolunteerCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'background_check':
        return 'bg-yellow-100 text-yellow-800';
      case 'training':
        return 'bg-purple-100 text-purple-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getButtonClasses = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">
            {volunteer.firstName} {volunteer.lastName}
          </h4>
          <p className="text-sm text-gray-500">{volunteer.email}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
            volunteer.volunteerStatus
          )}`}
        >
          {VOLUNTEER_STATUS_LABELS[volunteer.volunteerStatus as keyof typeof VOLUNTEER_STATUS_LABELS] ||
            volunteer.volunteerStatus}
        </span>
      </div>

      {/* Quick Info */}
      <div className="text-sm text-gray-600 mb-3">
        {volunteer.phone && (
          <p className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            {volunteer.phone}
          </p>
        )}
        {volunteer.applicationDate && (
          <p className="text-xs text-gray-400 mt-1">
            Applied: {formatDate(volunteer.applicationDate)}
          </p>
        )}
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-blue-600 hover:text-blue-800 mb-3"
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </button>

      {showDetails && (
        <div className="text-sm text-gray-600 border-t pt-3 mb-3 space-y-2">
          {volunteer.address && (
            <p>
              <span className="font-medium">Location:</span> {volunteer.address.city},{' '}
              {volunteer.address.state}
            </p>
          )}
          {volunteer.emergencyContact && (
            <p>
              <span className="font-medium">Emergency:</span> {volunteer.emergencyContact.name} (
              {volunteer.emergencyContact.relationship})
            </p>
          )}
          <div className="flex gap-4 text-xs">
            <p>
              <span className="font-medium">BG Check:</span>{' '}
              <span
                className={
                  volunteer.backgroundCheckStatus === 'approved'
                    ? 'text-green-600'
                    : volunteer.backgroundCheckStatus === 'rejected'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }
              >
                {volunteer.backgroundCheckStatus}
              </span>
            </p>
            <p>
              <span className="font-medium">Training:</span>{' '}
              <span
                className={
                  volunteer.trainingStatus === 'completed'
                    ? 'text-green-600'
                    : volunteer.trainingStatus === 'in_progress'
                    ? 'text-yellow-600'
                    : 'text-gray-600'
                }
              >
                {volunteer.trainingStatus}
              </span>
            </p>
          </div>
          {volunteer.rejectionReason && (
            <p className="text-red-600">
              <span className="font-medium">Rejection Reason:</span> {volunteer.rejectionReason}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {availableActions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {availableActions.map((action) => (
            <button
              key={action.action}
              onClick={() => onAction(action.action)}
              disabled={isLoading}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses(
                action.variant
              )}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
