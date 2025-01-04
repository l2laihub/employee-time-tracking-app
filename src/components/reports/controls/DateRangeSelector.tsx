import React from 'react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns';

interface DateRangeSelectorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateRangeSelector({ currentDate, onDateChange }: DateRangeSelectorProps) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const handlePreviousWeek = () => {
    onDateChange(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(currentDate, 1));
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handlePreviousWeek}
        className="p-2 text-gray-600 hover:text-gray-900"
      >
        ←
      </button>
      <span className="text-sm text-gray-600">
        {format(weekStart, 'MMM d, yyyy')} - {format(weekEnd, 'MMM d, yyyy')}
      </span>
      <button
        onClick={handleNextWeek}
        className="p-2 text-gray-600 hover:text-gray-900"
      >
        →
      </button>
    </div>
  );
}