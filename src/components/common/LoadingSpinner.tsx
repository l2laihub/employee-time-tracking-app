import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'medium',
  color = 'text-blue-600',
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} ${color}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          {message && (
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          )}
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  isLoading,
  loadingText = 'Loading...',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={`inline-flex items-center justify-center ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="small" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}