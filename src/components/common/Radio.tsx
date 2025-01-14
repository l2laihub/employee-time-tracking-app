import React from 'react';

interface RadioProps<T extends string = string> {
  value: T;
  children: React.ReactNode;
  checked?: boolean;
  onChange?: () => void;
  className?: string;
}

export default function Radio<T extends string = string>({ 
  value,
  children, 
  checked = false,
  onChange,
  className = ''
}: RadioProps<T>) {
  return (
    <label className={`flex items-center space-x-2 cursor-pointer ${className}`}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
      />
      <span className="text-gray-700">{children}</span>
    </label>
  );
}
