import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Label for the textarea field
   */
  label?: string;

  /**
   * Helper text to display below the textarea
   */
  helperText?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Number of rows to display
   * @default 3
   */
  rows?: number;

  /**
   * Whether the textarea spans the full width of its container
   * @default true
   */
  fullWidth?: boolean;
}

/**
 * TextArea component for multi-line text input
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      helperText,
      error,
      rows = 3,
      fullWidth = true,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles = 'block rounded-md border-neutral-200 shadow-sm text-sm text-neutral-900 placeholder:text-neutral-400';
    const focusStyles = 'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
    const disabledStyles = 'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed';
    const errorStyles = 'border-error-500 focus:border-error-500 focus:ring-error-500/20';

    return (
      <div className={twMerge('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={twMerge(
            baseStyles,
            focusStyles,
            disabledStyles,
            error && errorStyles
          )}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-helper-text`
              : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error-500"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p
            id={`${inputId}-helper-text`}
            className="text-sm text-neutral-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';