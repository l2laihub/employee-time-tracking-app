import React from 'react';
import { twMerge } from 'tailwind-merge';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  /**
   * Whether to show the text alongside the logo
   * @default true
   */
  showText?: boolean;

  /**
   * The size variant of the logo
   * @default 'md'
   */
  size?: LogoSize;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Logo component for consistent brand representation
 */
export const Logo = ({
  showText = true,
  size = 'md',
  className
}: LogoProps) => {
  const sizes = {
    sm: {
      logo: 'h-8 w-8',
      text: 'text-lg'
    },
    md: {
      logo: 'h-12 w-12',
      text: 'text-2xl'
    },
    lg: {
      logo: 'h-16 w-16',
      text: 'text-3xl'
    }
  };

  return (
    <div className={twMerge(
      'flex flex-col items-center justify-center',
      className
    )}>
      <img
        src="/clockflow_logo.svg"
        alt="ClockFlow Logo"
        className={twMerge(
          'object-contain',
          sizes[size].logo
        )}
      />
      {showText && (
        <span className={twMerge(
          'mt-2 font-display font-semibold text-neutral-900',
          sizes[size].text
        )}>
          Employee Time Tracking
        </span>
      )}
    </div>
  );
};

Logo.displayName = 'Logo';