import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '../design-system';

interface Stat {
  /**
   * Label for the stat
   */
  label: string;

  /**
   * Value to display
   */
  value: string;

  /**
   * Icon component to display
   */
  icon: LucideIcon;

  /**
   * Trend or additional information
   */
  trend: string;

  /**
   * Optional click handler
   */
  onClick?: () => void;
}

interface StatsGridProps {
  /**
   * Array of stats to display
   */
  stats: Stat[];
}

/**
 * Grid of statistics cards
 */
export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            interactive={Boolean(stat.onClick)}
            onClick={stat.onClick}
            className="p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon className="h-6 w-6 text-primary-500" />
              <span className="text-2xl font-display font-semibold text-neutral-900">
                {stat.value}
              </span>
            </div>
            <h3 className="font-medium text-neutral-700">{stat.label}</h3>
            <p className="text-sm text-neutral-500 mt-1">{stat.trend}</p>
          </Card>
        );
      })}
    </div>
  );
}
