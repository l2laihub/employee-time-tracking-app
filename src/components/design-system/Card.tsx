import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the card is interactive (has hover/active states)
   * @default false
   */
  interactive?: boolean;

  /**
   * Whether to add padding to the card
   * @default true
   */
  padding?: boolean;

  /**
   * Whether to add a border to the card
   * @default true
   */
  bordered?: boolean;

  /**
   * The elevation level of the card's shadow
   * @default 'default'
   */
  elevation?: 'none' | 'sm' | 'default' | 'md' | 'lg';

  /**
   * Whether the card spans the full width of its container
   * @default false
   */
  fullWidth?: boolean;
}

/**
 * Card component for grouping related content
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      interactive = false,
      padding = true,
      bordered = true,
      elevation = 'default',
      fullWidth = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-lg bg-white transition-all duration-150';

    const elevationStyles = {
      none: '',
      sm: 'shadow-sm',
      default: 'shadow',
      md: 'shadow-md',
      lg: 'shadow-lg'
    };

    const interactiveStyles = interactive
      ? 'hover:shadow-md hover:scale-[1.01] active:scale-100 active:shadow cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={twMerge(
          baseStyles,
          elevationStyles[elevation],
          bordered && 'border border-neutral-100',
          padding && 'p-6',
          fullWidth && 'w-full',
          interactiveStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';