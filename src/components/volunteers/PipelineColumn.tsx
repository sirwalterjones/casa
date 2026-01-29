import { Volunteer } from '@/types';
import VolunteerCard from './VolunteerCard';

interface PipelineColumnProps {
  title: string;
  status: string;
  volunteers: Volunteer[];
  color: string;
  onAction: (volunteerId: string, action: string) => void;
  loadingVolunteerId?: string | null;
  getAvailableActions: (status: string) => { action: string; label: string; variant: 'primary' | 'danger' | 'secondary' }[];
}

export default function PipelineColumn({
  title,
  status,
  volunteers,
  color,
  onAction,
  loadingVolunteerId,
  getAvailableActions,
}: PipelineColumnProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  const headerColorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <div
      className={`flex flex-col rounded-lg border ${colorClasses[color]} min-w-[300px] max-w-[350px] flex-shrink-0`}
    >
      {/* Column Header */}
      <div
        className={`px-4 py-3 rounded-t-lg ${headerColorClasses[color]} border-b border-opacity-50`}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <span className="px-2 py-0.5 text-sm font-medium rounded-full bg-white bg-opacity-50">
            {volunteers.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-3 overflow-y-auto max-h-[calc(100vh-250px)] space-y-3">
        {volunteers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <svg
              className="mx-auto h-8 w-8 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-sm">No volunteers</p>
          </div>
        ) : (
          volunteers.map((volunteer) => (
            <VolunteerCard
              key={volunteer.id}
              volunteer={volunteer}
              onAction={(action) => onAction(volunteer.id, action)}
              availableActions={getAvailableActions(status)}
              isLoading={loadingVolunteerId === volunteer.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
