import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ReportCardProps {
  report: {
    name: string;
    description: string;
    icon: LucideIcon;
  };
  onClick: () => void;
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const Icon = report.icon;
  
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left w-full"
    >
      <Icon className="w-8 h-8 text-blue-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.name}</h3>
      <p className="text-sm text-gray-600">{report.description}</p>
    </button>
  );
}