import React, { useEffect, useState } from 'react';
import type { TimeEntry } from '../../lib/types';
import type { JobLocation } from '../../lib/types';
import { formatDistanceToNow, format, parseISO, startOfDay } from 'date-fns';
import { listTimeEntries } from '../../services/timeEntries';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useTimeEntry } from '../../contexts/TimeEntryContext';

interface TimeEntryListProps {
  locations: JobLocation[];
  entriesPerPage?: number;
}

interface FilterOptions {
  status?: 'active' | 'break' | 'completed';
  locationId?: string;
  dateRange?: { start: Date; end: Date };
}

export default function TimeEntryList({ locations, entriesPerPage = 10 }: TimeEntryListProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { activeEntry } = useTimeEntry();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = async () => {
    if (!organization?.id || !user?.id) {
      setIsLoading(false);
      return;
    }

    const result = await listTimeEntries(organization.id, {
      employeeId: user.id
    });

    if (result.success) {
      const sortedEntries = [...(result.data as TimeEntry[])].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        if (a.status === 'break' && b.status !== 'break') return -1;
        if (b.status === 'break' && a.status !== 'break') return 1;
        return new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime();
      });
      setEntries(sortedEntries);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [organization?.id, user?.id]);

  useEffect(() => {
    fetchEntries();
  }, [activeEntry]);

  const filteredEntries = entries.filter(entry => {
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.locationId && entry.job_location_id !== filters.locationId) return false;
    if (filters.dateRange) {
      const entryDate = startOfDay(parseISO(entry.clock_in));
      if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) return false;
    }
    return true;
  });

  const ongoingEntries: TimeEntry[] = [];
  const groupedEntries = filteredEntries.reduce<{ [date: string]: TimeEntry[] }>((groups, entry) => {
    const status = entry.status?.toLowerCase();
    if (status === 'active' || status === 'break') {
      ongoingEntries.push(entry);
      return groups;
    }
    const date = format(parseISO(entry.clock_in), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
    return groups;
  }, {});

  Object.values(groupedEntries).forEach(entries => {
    entries.sort((a, b) => {
      return new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime();
    });
  });

  ongoingEntries.sort((a, b) => {
    const statusA = a.status?.toLowerCase();
    const statusB = b.status?.toLowerCase();
    if (statusA === 'active' && statusB !== 'active') return -1;
    if (statusB === 'active' && statusA !== 'active') return 1;
    return new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime();
  });

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedDates = Object.keys(groupedEntries)
    .sort((a, b) => b.localeCompare(a))
    .slice(startIndex, startIndex + entriesPerPage);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-50 text-green-700 ring-1 ring-green-600/20';
      case 'break':
        return 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20';
      default:
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Recent Time Entries</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <span className="mr-1">⚡</span>
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">Filter Time Entries</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={filters.status || ''}
              onChange={(e) => {
                const value = e.target.value as '' | 'active' | 'break' | 'completed';
                setFilters({ ...filters, status: value || undefined });
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="break">On Break</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filters.locationId || ''}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value || undefined })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            <button
              onClick={() => setFilters({})}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {ongoingEntries.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500">Ongoing Entries</h3>
            <div className="space-y-3">
              {ongoingEntries.map(entry => {
                const location = locations.find(loc => loc.id === entry.job_location_id);
                const startTime = parseISO(entry.clock_in);
                const isActive = entry.status?.toLowerCase() === 'active';

                return (
                  <div
                    key={entry.id}
                    className={`bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 ${
                      isActive ? 'border-blue-500' : 'border-orange-500'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          {location?.name || 'Unknown Location'}
                        </h3>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${getStatusStyles(entry.status || '')}`}>
                          {entry.status === 'active' ? 'Currently Working' : 'On Break'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div>Started at {format(startTime, 'h:mm a')}</div>
                        <div className="text-gray-400">{formatDistanceToNow(startTime)} ago</div>
                      </div>
                      {entry.work_description && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-md">
                          {entry.work_description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {paginatedDates.map(date => (
          <div key={date} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500">
              {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="space-y-3">
              {groupedEntries[date].map(entry => {
                const location = locations.find(loc => loc.id === entry.job_location_id);
                const startTime = parseISO(entry.clock_in);
                const endTime = entry.end_time ? parseISO(entry.end_time) : null;

                return (
                  <div
                    key={entry.id}
                    className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          {location?.name || 'Unknown Location'}
                        </h3>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${getStatusStyles(entry.status || '')}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-500">
                          {format(startTime, 'h:mm a')} - {endTime ? format(endTime, 'h:mm a') : 'Present'}
                        </div>
                        <div className="text-gray-400">
                          {formatDistanceToNow(startTime, { addSuffix: true })}
                        </div>
                      </div>
                      {entry.work_description && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                          {entry.work_description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + entriesPerPage, filteredEntries.length)}
                </span>{' '}
                of <span className="font-medium">{filteredEntries.length}</span> entries
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
