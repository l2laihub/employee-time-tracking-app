import { Employee, TimesheetEntry } from '../lib/types';
import { differenceInYears } from 'date-fns';

export function calculateVacationBalance(employee: Employee): number {
  const yearsOfService = differenceInYears(new Date(), new Date(employee.startDate));
  
  // Base vacation hours based on years of service
  if (yearsOfService < 1) {
    return 40; // 1 week
  } else if (yearsOfService < 2) {
    return 80; // 2 weeks
  } else {
    return 120; // 3 weeks
  }
}

export function calculateSickLeaveBalance(timesheets: TimesheetEntry[]): number {
  // Calculate total worked hours from timesheets
  const totalWorkedHours = timesheets.reduce((total, timesheet) => {
    return total + timesheet.totalHours;
  }, 0);

  // Calculate sick leave (1 hour per 40 hours worked)
  return Math.floor(totalWorkedHours / 40);
}

export function getVacationAllocationText(employee: Employee): string {
  const yearsOfService = differenceInYears(new Date(), new Date(employee.startDate));
  
  if (yearsOfService < 1) {
    return '1 week per year';
  } else if (yearsOfService < 2) {
    return '2 weeks per year';
  } else {
    return '3 weeks per year';
  }
}
