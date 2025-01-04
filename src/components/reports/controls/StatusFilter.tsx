import React from 'react';
import { CheckCircle } from 'lucide-react';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <CheckCircle className="h-4 w-4 text-gray-400" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pto">PTO</option>
      </select>
    </div>
  );
}