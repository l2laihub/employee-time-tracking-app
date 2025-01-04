import React from 'react';
import { Download } from 'lucide-react';
import { WeeklyEmployeeHours, EmployeeTimeEntry } from '../../../lib/mockReportData';

interface ExportButtonProps {
  data: WeeklyEmployeeHours[] | EmployeeTimeEntry[];
  filename: string;
}

export default function ExportButton({ data, filename }: ExportButtonProps) {
  const handleExport = () => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </button>
  );
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj)
      .map(value => `"${value}"`)
      .join(',')
  );
  
  return [headers, ...rows].join('\n');
}