import React from 'react';
import { Clock, Coffee, CheckCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'inactive' | 'active' | 'break';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let color;
  switch (status) {
    case 'active':
      color = 'bg-green-100 text-green-800';
      break;
    case 'break':
      color = 'bg-yellow-100 text-yellow-800';
      break;
    default:
      color = 'bg-gray-100 text-gray-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}