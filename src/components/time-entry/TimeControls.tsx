import React from 'react';
import { Clock, Coffee, CheckCircle } from 'lucide-react';

interface TimeControlsProps {
  isActive: boolean;
  isOnBreak: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
}

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
      <button
        onClick={onClockIn}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Clock In
      </button>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={onClockOut}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Clock Out
      </button>
      {isOnBreak ? (
        <button
          onClick={onEndBreak}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          End Break
        </button>
      ) : (
        <button
          onClick={onStartBreak}
          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          Start Break
        </button>
      )}
    </div>
  );
}