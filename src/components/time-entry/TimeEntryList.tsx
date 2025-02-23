import React, { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { format, parseISO, startOfDay } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useTimeEntry } from '../../contexts/TimeEntryContext';
import { listTimeEntries } from '../../services/timeEntries';
import { Button, Card, LoadingSpinner, Pagination } from '../design-system';
import TimeEntryCard from './TimeEntryCard';
import TimeEntryFilters, { TimeEntryFilters as Filters } from './TimeEntryFilters';
import type { TimeEntry, JobLocation } from '../../types/custom.types';

interface TimeEntryListProps {
  /**
   * Available job locations
   */
  locations: JobLocation[];

  /**
   * Number of entries to show per page
   */
  entriesPerPage?: number;
}

/**
 * List component for displaying time entries
 */
export default function TimeEntryList({ locations, entriesPerPage = 10 }: TimeEntryListProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { activeEntry } = useTimeEntry();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchEntries = async () => {
    if (!organization?.id || !user?.id) {
      setIsLoading(false);
      return;
    }

    const result = await listTimeEntries(organization.id, {
      employeeId: user.id
    });

    if (result.success && result.data) {
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

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedDates = Object.keys(groupedEntries)
    .sort((a, b) => b.localeCompare(a))
    .slice(startIndex, startIndex + entriesPerPage);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-error-50 border-error-100">
        <p className="text-error-700">Error: {error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-display font-semibold text-neutral-900">
          Recent Time Entries
        </h2>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<Filter className="h-4 w-4" />}
        >
          Filters
        </Button>
      </div>

      {showFilters && (
        <TimeEntryFilters
          filters={filters}
          locations={locations}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="space-y-6">
        {ongoingEntries.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-500">
              Ongoing Entries
            </h3>
            <div className="space-y-3">
              {ongoingEntries.map(entry => (
                <TimeEntryCard
                  key={entry.id}
                  entry={entry}
                  location={locations.find(loc => loc.id === entry.job_location_id)}
                  isOngoing
                />
              ))}
            </div>
          </div>
        )}

        {paginatedDates.map(date => (
          <div key={date} className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-500">
              {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="space-y-3">
              {groupedEntries[date].map(entry => (
                <TimeEntryCard
                  key={entry.id}
                  entry={entry}
                  location={locations.find(loc => loc.id === entry.job_location_id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEntries.length}
          itemsPerPage={entriesPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
