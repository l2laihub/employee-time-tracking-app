import React from 'react';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

export default function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateRangePickerProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseISO(e.target.value);
    onStartDateChange(date);
    
    if (date > endDate) {
      onEndDateChange(date);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseISO(e.target.value);
    if (date >= startDate) {
      onEndDateChange(date);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={handleStartDateChange}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <span className="text-gray-500">to</span>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={handleEndDateChange}
          min={format(startDate, 'yyyy-MM-dd')}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
    </div>
  );
}