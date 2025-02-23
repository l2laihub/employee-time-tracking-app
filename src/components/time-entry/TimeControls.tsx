import React from 'react';
import { Clock, Coffee, CheckCircle } from 'lucide-react';
import { Button } from '../design-system';

interface TimeControlsProps {
  /**
   * Whether the user is currently clocked in
   */
  isActive: boolean;

  /**
   * Whether the user is currently on break
   */
  isOnBreak: boolean;

  /**
   * Callback when user clocks in
   */
  onClockIn: () => void;

  /**
   * Callback when user clocks out
   */
  onClockOut: () => void;

  /**
   * Callback when user starts a break
   */
  onStartBreak: () => void;

  /**
   * Callback when user ends a break
   */
  onEndBreak: () => void;
}

/**
 * Time tracking control buttons component
 */
export default function TimeControls({
  isActive,
  isOnBreak,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak
}: TimeControlsProps) {
  if (!isActive) {
    return (
      <Button
        variant="primary"
        onClick={onClockIn}
        fullWidth
        size="lg"
        leftIcon={<Clock className="h-5 w-5" />}
      >
        Clock In
      </Button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row w-full gap-3">
      <Button
        variant="primary"
        onClick={onClockOut}
        fullWidth
        leftIcon={<CheckCircle className="h-5 w-5" />}
      >
        Clock Out
      </Button>
      
      {isOnBreak ? (
        <Button
          variant="primary"
          onClick={onEndBreak}
          fullWidth
          className="!bg-success-600 hover:!bg-success-700"
          leftIcon={<Coffee className="h-5 w-5" />}
        >
          End Break
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onStartBreak}
          fullWidth
          className="!bg-warning-600 hover:!bg-warning-700"
          leftIcon={<Coffee className="h-5 w-5" />}
        >
          Start Break
        </Button>
      )}
    </div>
  );
}