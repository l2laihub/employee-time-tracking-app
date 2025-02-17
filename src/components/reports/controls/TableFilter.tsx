import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface TableFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function TableFilter({ value, onChange, placeholder }: TableFilterProps) {
  const [inputValue, setInputValue] = useState(value[0] || '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChange(inputValue ? [inputValue] : []);
    }
  };

  const handleBlur = () => {
    onChange(inputValue ? [inputValue] : []);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}