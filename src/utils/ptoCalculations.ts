import { Employee, TimesheetEntry } from '../lib/types';
import { differenceInYears, differenceInMonths } from 'date-fns';

function calculateAutoVacation(startDate: string): number {
  const yearsOfService = differenceInYears(new Date(), new Date(startDate));
  
  // Pro-rate first year vacation based on months worked
  if (yearsOfService < 1) {
    const monthsWorked = differenceInMonths(new Date(), new Date(startDate));
    return Math.floor((40 * monthsWorked) / 12); // Pro-rated portion of 40 hours
  }
  
  if (yearsOfService < 2) return 80; // 2 weeks
  return 120; // 3 weeks
}

function calculateAutoSickLeave(timesheets: TimesheetEntry[]): number {
  const totalWorkedHours = timesheets.reduce((total, timesheet) => {
    // Only count approved timesheets
    if (timesheet.status === 'approved') {
      return total + timesheet.totalHours;
    }
    return total;
  }, 0);
  
  return Math.floor(totalWorkedHours / 40); // 1 hour per 40 worked
}

export function getVacationBalance(employee: Employee): number {
  // Check if employee has manual allocation
  if (employee.ptoAllocation?.vacation?.type === 'manual') {
    return employee.ptoAllocation.vacation.hours || 0;
  }
  return calculateAutoVacation(employee.startDate);
}

export function getSickLeaveBalance(employee: Employee, timesheets: TimesheetEntry[]): number {
  // Check if employee has manual allocation
  if (employee.ptoAllocation?.sickLeave?.type === 'manual') {
    return employee.ptoAllocation.sickLeave.hours || 0;
  }
  return calculateAutoSickLeave(timesheets);
}

export function getVacationAllocationText(employee: Employee): string {
  // Check if employee has manual allocation
  if (employee.ptoAllocation?.vacation?.type === 'manual') {
    return `Manual allocation (${employee.ptoAllocation.vacation.hours} hours)`;
  }
  
  const yearsOfService = differenceInYears(new Date(), new Date(employee.startDate));
  
  if (yearsOfService < 1) return '1 week per year (pro-rated)';
  if (yearsOfService < 2) return '2 weeks per year';
  return '3 weeks per year';
}

export function getSickLeaveAllocationText(employee: Employee): string {
  // Check if employee has manual allocation
  if (employee.ptoAllocation?.sickLeave?.type === 'manual') {
    return `Manual allocation (${employee.ptoAllocation.sickLeave.hours} hours)`;
  }
  return '1 hour per 40 hours worked';
}
