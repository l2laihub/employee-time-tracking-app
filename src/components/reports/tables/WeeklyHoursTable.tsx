import React from 'react';
import type { WeeklyEmployeeHours } from '../../../lib/mockReportData';

interface WeeklyHoursTableProps {
  data: WeeklyEmployeeHours[];
  onSelectEmployee: (employeeId: string) => void;
}

export default function WeeklyHoursTable({ data, onSelectEmployee }: WeeklyHoursTableProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const getTotalDayHours = (day: string) => {
    return data.reduce((sum, employee) => {
      return sum + employee.hours[day.toLowerCase() as keyof typeof employee.hours];
    }, 0);
  };

  const getTotalColumn = (type: 'regular' | 'ot' | 'pto') => {
    return data.reduce((sum, employee) => {
      switch (type) {
        case 'regular':
          return sum + employee.totalRegular;
        case 'ot':
          return sum + employee.totalOT;
        case 'pto':
          return sum + employee.totalPTO;
        default:
          return sum;
      }
    }, 0);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            {days.map(day => (
              <th key={day} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {day}
              </th>
            ))}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Regular Hours
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total OT Hours
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total PTO
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((employee) => (
            <tr 
              key={employee.id}
              onClick={() => onSelectEmployee(employee.id)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {employee.name}
              </td>
              {days.map(day => (
                <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.hours[day.toLowerCase() as keyof typeof employee.hours]}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {employee.totalRegular}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {employee.totalOT}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {employee.totalPTO}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-medium">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              Total
            </td>
            {days.map(day => (
              <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {getTotalDayHours(day)}
              </td>
            ))}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {getTotalColumn('regular')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {getTotalColumn('ot')}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {getTotalColumn('pto')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}