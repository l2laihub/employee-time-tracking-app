import React from 'react';
import { Clock, Coffee, CheckCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'inactive' | 'working' | 'break';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'working':
      return (
        <span className="flex items-center text-green-600">
          <Clock className="w-5 h-5 mr-2" />
          Currently Working
        </span>
      );
    case 'break':
      return (
        <span className="flex items-center text-orange-600">
          <Coffee className="w-5 h-5 mr-2" />
          On Break
        </span>
      );
    default:
      return (
        <span className="flex items-center text-gray-600">
          <CheckCircle className="w-5 h-5 mr-2" />
          Not Clocked In
        </span>
      );
  }
}