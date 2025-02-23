import React from 'react';
import { TextArea } from '../design-system';

interface NotesFieldProps {
  /**
   * The current value of the notes field
   */
  value: string;
  
  /**
   * Callback when the notes value changes
   */
  onChange: (value: string) => void;
  
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
}

/**
 * Notes field component for time entry annotations
 */
export default function NotesField({ value, onChange, disabled }: NotesFieldProps) {
  return (
    <TextArea
      label="Notes"
      placeholder="Add notes about your work..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
    />
  );
}
