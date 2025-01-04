import React from 'react';
import EmployeeHoursReport from '../components/reports/EmployeeHoursReport';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Hours Report</h1>
        <p className="text-gray-600">View and analyze employee working hours</p>
      </div>
      <EmployeeHoursReport />
    </div>
  );
}