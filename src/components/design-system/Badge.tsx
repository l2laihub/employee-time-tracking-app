import React from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * The visual style variant of the badge
   * @default 'default'
   */
  variant?: BadgeVariant;

  /**
   * The size of the badge
   * @default 'md'
   */
  size?: BadgeSize;

  /**
   * Icon to display before the badge text
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display after the badge text
   */
  rightIcon?: React.ReactNode;
}

/**
 * Badge component for status indicators and labels
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full';

    const variants = {
      default: 'bg-neutral-100 text-neutral-700',
      primary: 'bg-primary-50 text-primary-700',
      success: 'bg-success-50 text-success-700',
      warning: 'bg-warning-50 text-warning-700',
      error: 'bg-error-50 text-error-700'
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm'
    };

    return (
      <span
        ref={ref}
        className={twMerge(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {leftIcon && <span className="mr-1 -ml-0.5">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-1 -mr-0.5">{rightIcon}</span>}
      </span>
    );
  }
);

Badge.displayName = 'Badge';