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
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base sm:text-sm"
      >
        <Clock className="inline-block w-5 h-5 mr-2" />
        Clock In
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row w-full gap-3">
      <button
        onClick={onClockOut}
        className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-base sm:text-sm"
      >
        <CheckCircle className="inline-block w-5 h-5 mr-2" />
        Clock Out
      </button>
      {isOnBreak ? (
        <button
          onClick={onEndBreak}
          className="flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-base sm:text-sm"
        >
          <Coffee className="inline-block w-5 h-5 mr-2" />
          End Break
        </button>
      ) : (
        <button
          onClick={onStartBreak}
          className="flex-1 px-4 py-3 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-base sm:text-sm"
        >
          <Coffee className="inline-block w-5 h-5 mr-2" />
          Start Break
        </button>
      )}
    </div>
  );
}