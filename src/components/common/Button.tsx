import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  type,
  disabled
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variantStyles = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  return (
    <button
      type={type || 'button'}
      className={`${baseStyles} ${variantStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
