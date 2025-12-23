import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface CourtHearing {
  id: string;
  case_number: string;
  child_name: string;
  hearing_date: string;
  hearing_time: string;
  hearing_type: string;
  court_room: string;
  judge_name: string;
  notes: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hearings: CourtHearing[];
}

export default function CalendarPage() {
  const { user, loading } = useRequireAuth();
  const [hearings, setHearings] = useState<CourtHearing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    const loadHearings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.casaGet('court-hearings');

        if (response.success && response.data) {
          const hearingsData = response.data as any;
          if (hearingsData.success && hearingsData.data?.hearings) {
            setHearings(hearingsData.data.hearings);
          } else if (hearingsData.hearings) {
            setHearings(hearingsData.hearings);
          } else {
            setHearings([]);
          }
        }
      } catch (error: any) {
        console.error('Failed to load hearings:', error);
        setError(error?.message || 'Failed to load court hearings');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadHearings();
    }
  }, [user]);

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const dayHearings = hearings.filter(h => h.hearing_date === dateStr);

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        hearings: dayHearings
      });
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getUpcomingHearings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return hearings
      .filter(h => new Date(h.hearing_date) >= today)
      .sort((a, b) => new Date(a.hearing_date).getTime() - new Date(b.hearing_date).getTime())
      .slice(0, 10);
  };

  const getHearingTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'permanency': return 'bg-purple-100 text-purple-800';
      case 'disposition': return 'bg-orange-100 text-orange-800';
      case 'termination': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();
  const upcomingHearings = getUpcomingHearings();

  return (
    <>
      <Head>
        <title>Calendar - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-light mb-2">Court Calendar</h1>
                  <p className="text-purple-100 text-lg">Track upcoming court hearings and important dates</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-white text-purple-700'
                        : 'bg-purple-500 text-white hover:bg-purple-400 border border-purple-400'
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-purple-700'
                        : 'bg-purple-500 text-white hover:bg-purple-400 border border-purple-400'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {viewMode === 'calendar' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold text-gray-900">{formatMonthYear()}</h2>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b bg-gray-50">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-24 p-2 border-b border-r ${
                      !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                    } ${day.isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    <div className="mt-1 space-y-1">
                      {day.hearings.slice(0, 2).map((hearing, i) => (
                        <div
                          key={i}
                          className="text-xs p-1 bg-purple-100 text-purple-800 rounded truncate cursor-pointer hover:bg-purple-200"
                          title={`${hearing.child_name} - ${hearing.hearing_type}`}
                        >
                          {hearing.hearing_time && `${hearing.hearing_time} `}{hearing.child_name}
                        </div>
                      ))}
                      {day.hearings.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{day.hearings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Hearings</h2>
              </div>
              {upcomingHearings.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming hearings</h3>
                  <p className="mt-1 text-sm text-gray-500">Court hearings will appear here when scheduled.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {upcomingHearings.map((hearing) => (
                    <div key={hearing.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-medium text-gray-900">{hearing.child_name}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getHearingTypeColor(hearing.hearing_type)}`}>
                              {hearing.hearing_type || 'Hearing'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Case: {hearing.case_number}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(hearing.hearing_date).toLocaleDateString()}
                            </span>
                            {hearing.hearing_time && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {hearing.hearing_time}
                              </span>
                            )}
                            {hearing.court_room && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {hearing.court_room}
                              </span>
                            )}
                          </div>
                          {hearing.judge_name && (
                            <p className="text-sm text-gray-500 mt-1">Judge: {hearing.judge_name}</p>
                          )}
                          {hearing.notes && (
                            <p className="text-sm text-gray-500 mt-2 italic">{hearing.notes}</p>
                          )}
                        </div>
                        <Link
                          href={`/cases/${hearing.case_number}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          View Case
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary Stats */}
          {hearings.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-gray-900">{hearings.length}</div>
                <div className="text-sm text-gray-600">Total Hearings</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-purple-600">{upcomingHearings.length}</div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {hearings.filter(h => h.hearing_type?.toLowerCase() === 'review').length}
                </div>
                <div className="text-sm text-gray-600">Review Hearings</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {hearings.filter(h => h.hearing_type?.toLowerCase() === 'permanency').length}
                </div>
                <div className="text-sm text-gray-600">Permanency Hearings</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
