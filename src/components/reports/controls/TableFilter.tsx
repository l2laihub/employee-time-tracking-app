import React from 'react';
import { Search } from 'lucide-react';

interface TableFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TableFilter({ value, onChange, placeholder }: TableFilterProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder={placeholder || "Search..."}
      />
    </div>
  );
}