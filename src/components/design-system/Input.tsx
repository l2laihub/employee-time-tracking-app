import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label for the input field
   */
  label?: string;

  /**
   * Helper text to display below the input
   */
  helperText?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Left icon to display inside the input
   */
  leftIcon?: React.ReactNode;

  /**
   * Right icon to display inside the input
   */
  rightIcon?: React.ReactNode;

  /**
   * Whether the input spans the full width of its container
   * @default true
   */
  fullWidth?: boolean;
}

/**
 * Input component for collecting user input
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseInputStyles = 'input';
    const iconStyles = 'absolute top-1/2 -translate-y-1/2 text-neutral-400';

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
          
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              baseInputStyles,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              disabled && 'bg-neutral-50 text-neutral-500 cursor-not-allowed'
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
          
          {rightIcon && (
            <div className={twMerge(iconStyles, 'right-3')}>
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';