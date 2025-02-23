import React from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Card, Badge } from '../design-system';
import type { TimeEntry, JobLocation } from '../../types/custom.types';

interface TimeEntryCardProps {
  /**
   * The time entry to display
   */
  entry: TimeEntry;

  /**
   * The job location associated with the entry
   */
  location?: JobLocation;

  /**
   * Whether this is an ongoing entry
   */
  isOngoing?: boolean;
}

/**
 * Card component for displaying a time entry
 */
export default function TimeEntryCard({ entry, location, isOngoing }: TimeEntryCardProps) {
  const startTime = parseISO(entry.clock_in);
  const endTime = entry.clock_out ? parseISO(entry.clock_out) : null;
  const isActive = entry.status?.toLowerCase() === 'active';

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          variant: 'success' as const,
          label: 'Completed'
        };
      case 'break':
        return {
          variant: 'warning' as const,
          label: 'On Break'
        };
      case 'active':
        return {
          variant: 'primary' as const,
          label: 'Currently Working'
        };
      default:
        return {
          variant: 'default' as const,
          label: status
        };
    }
  };

  const statusConfig = getStatusConfig(entry.status || '');

  return (
    <Card
      className={`hover:shadow-md transition-all duration-150 ${
        isOngoing
          ? isActive
            ? 'border-l-4 border-l-primary-500'
            : 'border-l-4 border-l-warning-500'
          : ''
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">
            {location?.name || 'Unknown Location'}
          </h3>
          <Badge
            variant={statusConfig.variant}
            size="sm"
          >
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-neutral-600">
            {format(startTime, 'h:mm a')} - {endTime ? format(endTime, 'h:mm a') : 'Present'}
          </div>
          <div className="text-neutral-500">
            {formatDistanceToNow(startTime, { addSuffix: true })}
          </div>
        </div>

        {entry.work_description && (
          <p className="text-sm text-neutral-600 bg-neutral-50 p-2 rounded-md">
            {entry.work_description}
          </p>
        )}
      </div>
    </Card>
  );
}