import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';
import { caseService } from '@/services/caseService';

interface CourtHearing {
  id: string;
  case_id?: string | number;
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHearing, setSelectedHearing] = useState<CourtHearing | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');

  useEffect(() => {
    const loadHearings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let allHearings: CourtHearing[] = [];

        // Try to load court hearings from dedicated endpoint
        const response = await apiClient.casaGet('court-hearings');
        console.log('Court hearings API response:', response);

        if (response.success && response.data) {
          const hearingsData = response.data as any;
          console.log('Hearings data structure:', hearingsData);

          // Handle multiple possible response structures:
          // 1. { success: true, data: { hearings: [...] } } - new format
          // 2. { success: true, data: [...] } - old format (array directly)
          // 3. { hearings: [...] } - direct hearings object
          // 4. [...] - direct array

          let hearingsArray: any[] = [];

          if (hearingsData.success && hearingsData.data?.hearings) {
            // New nested format
            hearingsArray = hearingsData.data.hearings;
          } else if (hearingsData.data?.hearings) {
            // Partially nested
            hearingsArray = hearingsData.data.hearings;
          } else if (hearingsData.hearings) {
            // Direct hearings property
            hearingsArray = hearingsData.hearings;
          } else if (Array.isArray(hearingsData.data)) {
            // Old format - array directly in data
            hearingsArray = hearingsData.data;
          } else if (Array.isArray(hearingsData)) {
            // Direct array
            hearingsArray = hearingsData;
          }

          console.log('Parsed hearings array:', hearingsArray);

          if (hearingsArray && hearingsArray.length > 0) {
            allHearings = hearingsArray.map((h: any) => ({
              id: h.id || `hearing-${Math.random()}`,
              case_number: h.case_number || '',
              child_name: h.child_name || 'Unknown',
              hearing_date: h.hearing_date?.split('T')[0] || h.hearing_date,
              hearing_time: h.hearing_time || '9:00 AM',
              hearing_type: h.hearing_type || 'Review',
              court_room: h.court_room || '',
              judge_name: h.judge_name || '',
              notes: h.notes || ''
            }));
          }
        }

        console.log('Hearings from court-hearings endpoint:', allHearings.length);

        // Also load hearings from case next_court_dates as a supplementary source
        const casesResponse = await caseService.getCases({ limit: 100 });
        console.log('Cases response:', casesResponse);

        if (casesResponse.success && casesResponse.data) {
          const casesData = casesResponse.data as any;
          const cases = casesData.data?.cases || casesData.cases || casesData || [];
          console.log('Cases loaded:', cases.length);

          const hearingsFromCases = cases
            .filter((c: any) => c.next_court_date)
            .map((c: any, idx: number) => ({
              id: `case-${c.id}-${idx}`,
              case_number: c.case_number || `CASA-${c.id}`,
              child_name: c.child_name || c.child_first_name
                ? `${c.child_first_name || ''} ${c.child_last_name || ''}`.trim()
                : 'Unknown Child',
              hearing_date: c.next_court_date?.split('T')[0] || c.next_court_date,
              hearing_time: c.next_court_time || '9:00 AM',
              hearing_type: c.hearing_type || 'Review',
              court_room: c.court_jurisdiction || 'Main Courtroom',
              judge_name: c.judge_name || '',
              notes: c.court_notes || ''
            }));

          console.log('Hearings from cases:', hearingsFromCases.length);

          // Merge hearings, avoiding duplicates by case_number
          const existingCaseNumbers = new Set(allHearings.map(h => h.case_number));
          hearingsFromCases.forEach((h: CourtHearing) => {
            if (!existingCaseNumbers.has(h.case_number)) {
              allHearings.push(h);
              existingCaseNumbers.add(h.case_number);
            }
          });
        }

        console.log('Total hearings loaded:', allHearings.length);
        setHearings(allHearings);
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

  // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

      // Use local date format to avoid timezone issues
      const dateStr = formatDateLocal(date);
      const dayHearings = hearings.filter(h => {
        const hearingDateStr = h.hearing_date?.split('T')[0] || h.hearing_date;
        return hearingDateStr === dateStr;
      });

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        hearings: dayHearings
      });
    }

    return days;
  };

  const getWeekDays = (): CalendarDay[] => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      // Use local date format to avoid timezone issues
      const dateStr = formatDateLocal(date);
      const dayHearings = hearings.filter(h => {
        const hearingDateStr = h.hearing_date?.split('T')[0] || h.hearing_date;
        return hearingDateStr === dateStr;
      });

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        hearings: dayHearings
      });
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = () => {
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      }
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short' })} ${startOfWeek.getDate()} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short' })} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getUpcomingHearings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return hearings
      .filter(h => new Date(h.hearing_date) >= today)
      .sort((a, b) => new Date(a.hearing_date).getTime() - new Date(b.hearing_date).getTime());
  };

  const getHearingTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'review': return { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100', border: 'border-blue-300' };
      case 'permanency': return { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100', border: 'border-purple-300' };
      case 'disposition': return { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100', border: 'border-orange-300' };
      case 'termination': return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100', border: 'border-red-300' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-700', light: 'bg-gray-100', border: 'border-gray-300' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hearingDate = new Date(dateStr);
    hearingDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((hearingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `In ${diff} days`;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage="/calendar" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = viewMode === 'week' ? getWeekDays() : getCalendarDays();
  const upcomingHearings = getUpcomingHearings();
  const selectedDateHearings = selectedDate
    ? hearings.filter(h => {
        const hearingDateStr = h.hearing_date?.split('T')[0] || h.hearing_date;
        return hearingDateStr === formatDateLocal(selectedDate);
      })
    : [];

  return (
    <>
      <Head>
        <title>Court Calendar - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navigation currentPage="/calendar" />

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Court Calendar</h1>
                  <p className="text-indigo-100 text-lg">
                    {upcomingHearings.length} upcoming hearing{upcomingHearings.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-1 flex">
                    <button
                      onClick={() => setViewMode('month')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'month'
                          ? 'bg-white text-indigo-700 shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setViewMode('week')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'week'
                          ? 'bg-white text-indigo-700 shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setViewMode('agenda')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'agenda'
                          ? 'bg-white text-indigo-700 shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Agenda
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Calendar Area */}
            <div className="flex-1">
              {viewMode === 'agenda' ? (
                /* Agenda View */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Upcoming Hearings</h2>
                    <p className="text-gray-500 text-sm mt-1">All scheduled court appearances</p>
                  </div>
                  {upcomingHearings.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">No upcoming hearings</h3>
                      <p className="mt-2 text-gray-500">Court hearings will appear here when scheduled.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {upcomingHearings.map((hearing) => {
                        const colors = getHearingTypeColor(hearing.hearing_type);
                        return (
                          <div
                            key={hearing.id}
                            onClick={() => setSelectedHearing(hearing)}
                            className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-1 h-full min-h-[80px] rounded-full ${colors.bg}`}></div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">{hearing.child_name}</h3>
                                    <p className="text-gray-500 text-sm">Case: {hearing.case_number}</p>
                                  </div>
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colors.light} ${colors.text}`}>
                                    {hearing.hearing_type || 'Hearing'}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                                  <span className="flex items-center gap-2 text-gray-600">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatDate(hearing.hearing_date)}
                                  </span>
                                  {hearing.hearing_time && (
                                    <span className="flex items-center gap-2 text-gray-600">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {hearing.hearing_time}
                                    </span>
                                  )}
                                  {hearing.court_room && (
                                    <span className="flex items-center gap-2 text-gray-600">
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      {hearing.court_room}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                    getDaysUntil(hearing.hearing_date) === 'Today'
                                      ? 'bg-red-100 text-red-700'
                                      : getDaysUntil(hearing.hearing_date) === 'Tomorrow'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {getDaysUntil(hearing.hearing_date)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Calendar Grid View */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <h2 className="text-xl font-bold text-gray-900 ml-2">{formatMonthYear()}</h2>
                    </div>
                    <button
                      onClick={goToToday}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center text-sm font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
                        {day}
                      </div>
                    ))}
                    {calendarDays.map((day, index) => {
                      const hasHearings = day.hearings.length > 0;
                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedDate(day.date)}
                          className={`min-h-[120px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                            !day.isCurrentMonth ? 'bg-gray-50' : 'hover:bg-gray-50'
                          } ${day.isToday ? 'bg-indigo-50' : ''} ${
                            selectedDate?.toDateString() === day.date.toDateString() ? 'ring-2 ring-indigo-500 ring-inset' : ''
                          }`}
                        >
                          <div className={`flex items-center justify-between mb-2`}>
                            <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full ${
                              day.isToday
                                ? 'bg-indigo-600 text-white'
                                : !day.isCurrentMonth
                                ? 'text-gray-400'
                                : 'text-gray-900'
                            }`}>
                              {day.date.getDate()}
                            </span>
                            {hasHearings && (
                              <span className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-indigo-500 rounded-full">
                                {day.hearings.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {day.hearings.slice(0, 3).map((hearing, i) => {
                              const colors = getHearingTypeColor(hearing.hearing_type);
                              return (
                                <div
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHearing(hearing);
                                  }}
                                  className={`text-xs p-1.5 rounded-lg truncate cursor-pointer transition-all hover:shadow-md ${colors.light} ${colors.text} border ${colors.border}`}
                                >
                                  <div className="font-semibold truncate">{hearing.child_name}</div>
                                  {hearing.hearing_time && (
                                    <div className="text-[10px] opacity-75">{hearing.hearing_time}</div>
                                  )}
                                </div>
                              );
                            })}
                            {day.hearings.length > 3 && (
                              <div className="text-xs text-gray-500 font-medium pl-1">
                                +{day.hearings.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Selected Date Details */}
              {selectedDate && selectedDateHearings.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-indigo-50">
                    <h3 className="font-bold text-gray-900">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedDateHearings.length} hearing{selectedDateHearings.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {selectedDateHearings.map((hearing) => {
                      const colors = getHearingTypeColor(hearing.hearing_type);
                      return (
                        <div
                          key={hearing.id}
                          onClick={() => setSelectedHearing(hearing)}
                          className="p-4 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-1 h-12 rounded-full ${colors.bg}`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{hearing.child_name}</div>
                              <div className="text-sm text-gray-500">{hearing.hearing_time}</div>
                              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${colors.light} ${colors.text}`}>
                                {hearing.hearing_type || 'Hearing'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Hearing Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Total Scheduled</span>
                    <span className="text-xl font-bold text-gray-900">{hearings.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                    <span className="text-indigo-600">Upcoming</span>
                    <span className="text-xl font-bold text-indigo-600">{upcomingHearings.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                    <span className="text-blue-600">Review</span>
                    <span className="text-xl font-bold text-blue-600">
                      {hearings.filter(h => h.hearing_type?.toLowerCase() === 'review').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                    <span className="text-purple-600">Permanency</span>
                    <span className="text-xl font-bold text-purple-600">
                      {hearings.filter(h => h.hearing_type?.toLowerCase() === 'permanency').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Hearing Types</h3>
                <div className="space-y-2">
                  {[
                    { type: 'Review', desc: 'Status review hearings' },
                    { type: 'Permanency', desc: 'Permanency planning' },
                    { type: 'Disposition', desc: 'Initial placement decisions' },
                    { type: 'Termination', desc: 'TPR proceedings' }
                  ].map(({ type, desc }) => {
                    const colors = getHearingTypeColor(type);
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors.bg}`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{type}</div>
                          <div className="text-xs text-gray-500">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Hearing Detail Modal */}
        {selectedHearing && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setSelectedHearing(null)}>
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"></div>
              <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedHearing(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {(() => {
                  const colors = getHearingTypeColor(selectedHearing.hearing_type);
                  return (
                    <>
                      <div className="flex items-start gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedHearing.child_name}</h2>
                          <p className="text-gray-500">Case: {selectedHearing.case_number}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <div className="text-sm text-gray-500">Date</div>
                            <div className="font-semibold">{formatDate(selectedHearing.hearing_date)}</div>
                          </div>
                        </div>

                        {selectedHearing.hearing_time && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <div className="text-sm text-gray-500">Time</div>
                              <div className="font-semibold">{selectedHearing.hearing_time}</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <div>
                            <div className="text-sm text-gray-500">Hearing Type</div>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colors.light} ${colors.text}`}>
                              {selectedHearing.hearing_type || 'Hearing'}
                            </span>
                          </div>
                        </div>

                        {selectedHearing.court_room && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <div>
                              <div className="text-sm text-gray-500">Courtroom</div>
                              <div className="font-semibold">{selectedHearing.court_room}</div>
                            </div>
                          </div>
                        )}

                        {selectedHearing.judge_name && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                              <div className="text-sm text-gray-500">Judge</div>
                              <div className="font-semibold">{selectedHearing.judge_name}</div>
                            </div>
                          </div>
                        )}

                        {selectedHearing.notes && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="text-sm font-medium text-amber-800 mb-1">Notes</div>
                            <div className="text-sm text-amber-700">{selectedHearing.notes}</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex gap-3">
                        <Link
                          href={`/cases/${selectedHearing.case_id || selectedHearing.id}`}
                          className="flex-1 px-4 py-3 bg-indigo-600 text-white text-center rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                        >
                          View Case Details
                        </Link>
                        <button
                          onClick={() => setSelectedHearing(null)}
                          className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
