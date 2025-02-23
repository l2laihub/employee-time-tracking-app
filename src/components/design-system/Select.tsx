import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Label for the select field
   */
  label?: string;

  /**
   * Helper text to display below the select
   */
  helperText?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;

  /**
   * Whether the select spans the full width of its container
   * @default true
   */
  fullWidth?: boolean;
}

/**
 * Select component for choosing from a list of options
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      fullWidth = true,
      className,
      disabled,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles = 'block rounded-md border-neutral-200 shadow-sm text-sm text-neutral-900 pr-10';
    const focusStyles = 'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
    const disabledStyles = 'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed';
    const errorStyles = 'border-error-500 focus:border-error-500 focus:ring-error-500/20';
    const iconStyles = 'absolute top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400';

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
        
        <div className="relative">
          {leftIcon && (
            <div className={twMerge(iconStyles, 'left-3')}>
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={inputId}
            className={twMerge(
              baseStyles,
              focusStyles,
              disabledStyles,
              error && errorStyles,
              leftIcon && 'pl-10'
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
          >
            {children}
          </select>

          <div className={twMerge(iconStyles, 'right-3')}>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>

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

Select.displayName = 'Select';