import React from 'react';
import { BarChart2, Users, Clock, TrendingUp } from 'lucide-react';

export default function ReportsList() {
  const reports = [
    {
      name: 'Employee Hours',
      description: 'Weekly hours by employee',
      icon: Clock,
      link: '/reports/hours'
    },
    {
      name: 'Job Completion',
      description: 'Job completion rates and times',
      icon: TrendingUp,
      link: '/reports/completion'
    },
    {
      name: 'Employee Performance',
      description: 'Individual performance metrics',
      icon: Users,
      link: '/reports/performance'
    },
    {
      name: 'Cost Analysis',
      description: 'Labor costs and efficiency',
      icon: BarChart2,
      link: '/reports/costs'
    }
  ];

  return (
    <div className="space-y-4">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <button
            key={report.name}
            className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Icon className="w-5 h-5 text-blue-500" />
            <div className="ml-4 text-left">
              <h3 className="font-medium">{report.name}</h3>
              <p className="text-sm text-gray-500">{report.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}