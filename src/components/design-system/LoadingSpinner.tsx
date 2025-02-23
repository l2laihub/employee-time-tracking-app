import React from 'react';
import { twMerge } from 'tailwind-merge';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'primary' | 'secondary' | 'white';

export interface LoadingSpinnerProps {
  /**
   * The size of the spinner
   * @default 'md'
   */
  size?: SpinnerSize;

  /**
   * The color variant of the spinner
   * @default 'primary'
   */
  variant?: SpinnerVariant;

  /**
   * Whether to center the spinner in a full-screen container
   * @default false
   */
  fullScreen?: boolean;

  /**
   * Label for accessibility
   * @default 'Loading'
   */
  label?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Loading spinner component for indicating loading states
 */
export const LoadingSpinner = ({
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  label = 'Loading',
  className
}: LoadingSpinnerProps) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  const variants = {
    primary: 'border-primary-600 border-t-transparent',
    secondary: 'border-neutral-600 border-t-transparent',
    white: 'border-white border-t-transparent'
  };

  const spinner = (
    <div
      role="status"
      className="inline-flex flex-col items-center"
    >
      <div
        className={twMerge(
          'animate-spin rounded-full',
          sizes[size],
          variants[variant],
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

LoadingSpinner.displayName = 'LoadingSpinner';