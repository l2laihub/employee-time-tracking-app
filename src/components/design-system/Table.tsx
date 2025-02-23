import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T, K extends string = string> {
  /**
   * Unique key for the column
   */
  key: K;

  /**
   * Header text for the column
   */
  header: string;

  /**
   * Function to render the cell content
   */
  render: (item: T) => React.ReactNode;

  /**
   * Whether the column is sortable
   */
  sortable?: boolean;

  /**
   * Custom header cell class names
   */
  headerClassName?: string;

  /**
   * Custom cell class names
   */
  cellClassName?: string;
}

export interface TableProps<T, K extends string = string> {
  /**
   * Array of column definitions
   */
  columns: Column<T, K>[];

  /**
   * Array of data items
   */
  data: T[];

  /**
   * Key function to generate unique keys for rows
   */
  keyExtractor: (item: T) => string;

  /**
   * Current sort configuration
   */
  sortConfig?: {
    key: K;
    direction: 'asc' | 'desc';
  };

  /**
   * Callback when sort changes
   */
  onSort?: (key: K) => void;

  /**
   * Whether the table is in a loading state
   */
  loading?: boolean;

  /**
   * Additional CSS classes for the table container
   */
  className?: string;
}

/**
 * Table component for displaying data in a structured format
 */
export function Table<T, K extends string = string>({
  columns,
  data,
  keyExtractor,
  sortConfig,
  onSort,
  loading,
  className
}: TableProps<T, K>) {
  const renderSortIcon = (key: K) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className={twMerge('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map(({ key, header, sortable, headerClassName }) => (
              <th
                key={key}
                onClick={() => sortable && onSort?.(key)}
                className={twMerge(
                  'px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider',
                  sortable && 'cursor-pointer hover:bg-neutral-100',
                  headerClassName
                )}
              >
                <div className="flex items-center space-x-1">
                  <span>{header}</span>
                  {sortable && renderSortIcon(key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {data.map(item => (
            <tr key={keyExtractor(item)}>
              {columns.map(({ key, render, cellClassName }) => (
                <td
                  key={key}
                  className={twMerge(
                    'px-6 py-4 whitespace-nowrap text-sm text-neutral-900',
                    cellClassName
                  )}
                >
                  {render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Table.displayName = 'Table';