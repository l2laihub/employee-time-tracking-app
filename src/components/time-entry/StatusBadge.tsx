import { Clock, Coffee, CheckCircle, CheckSquare } from 'lucide-react';
import { Badge } from '../design-system';

export type TimeEntryStatus = 'inactive' | 'active' | 'break' | 'completed';

export interface StatusBadgeProps {
  /**
   * The current status of the time entry
   */
  status: TimeEntryStatus;
}

/**
 * Status badge component for time entry states
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      variant: 'success' as const,
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Active'
    },
    break: {
      variant: 'warning' as const,
      icon: <Coffee className="h-3 w-3" />,
      label: 'Break'
    },
    inactive: {
      variant: 'default' as const,
      icon: <Clock className="h-3 w-3" />,
      label: 'Inactive'
    },
    completed: {
      variant: 'primary' as const,
      icon: <CheckSquare className="h-3 w-3" />,
      label: 'Completed'
    }
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size="sm"
      leftIcon={config.icon}
    >
      {config.label}
    </Badge>
  );
}