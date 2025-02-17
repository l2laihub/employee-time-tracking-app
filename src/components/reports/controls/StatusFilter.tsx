import React from 'react';
import { Clock } from 'lucide-react';

interface StatusFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
      .filter(value => value !== ''); // Remove empty values
    onChange(selectedOptions);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      <select
        multiple
        value={value}
        onChange={handleSelectChange}
        size={4}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {STATUS_OPTIONS.map(status => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      {value.length === 0 && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-sm text-gray-400">All Statuses</span>
        </div>
      )}
    </div>
  );
}