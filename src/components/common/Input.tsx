import React from 'react';

interface InputProps {
  type?: 'text' | 'number' | 'email' | 'password';
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

export default function Input({
  type = 'text',
  label,
  value,
  onChange,
  placeholder = '',
  className = '',
  error,
  min,
  max,
  required
}: InputProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        required={required}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm
          focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
