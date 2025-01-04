import React from 'react';
import { MapPin } from 'lucide-react';
import { jobLocations } from '../../../lib/mockReportData';

interface LocationFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function LocationFilter({ value, onChange }: LocationFilterProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MapPin className="h-4 w-4 text-gray-400" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="">All Locations</option>
        {jobLocations.map((location) => (
          <option key={location.id} value={location.name}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
}