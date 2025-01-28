import React from 'react';

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function NotesField({ value, onChange, disabled }: NotesFieldProps) {
  return (
    <div>
      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
        Notes
      </label>
      <textarea
        id="notes"
        rows={3}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder="Add notes about your work..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
