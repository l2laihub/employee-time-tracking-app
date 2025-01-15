import { Employee, TimesheetEntry } from '../lib/types';
import { differenceInYears, differenceInMonths } from 'date-fns';

interface PTORules {
  firstYearVacationDays: number;
  secondYearVacationDays: { min: number; max: number };
  thirdYearPlusVacationDays: { min: number; max: number };
  sickLeaveAccrualHours: number;
}

function calculateAutoVacation(startDate: string, rules?: PTORules): number {
  // Default PTO rules if none provided
  const defaultRules = {
    firstYearVacationDays: 5,
    secondYearVacationDays: { min: 10, max: 10 },
    thirdYearPlusVacationDays: { min: 15, max: 15 },
    sickLeaveAccrualHours: 40
  };
  
  const effectiveRules = rules || defaultRules;
  const yearsOfService = differenceInYears(new Date(), new Date(startDate));
  const hoursPerDay = 8; // Standard work day hours
  
  // Pro-rate first year vacation based on months worked
  if (yearsOfService < 1) {
    const monthsWorked = differenceInMonths(new Date(), new Date(startDate));
    return Math.floor((effectiveRules.firstYearVacationDays * hoursPerDay * monthsWorked) / 12);
  }
  
  if (yearsOfService < 2) {
    return effectiveRules.secondYearVacationDays.max * hoursPerDay;
  }
  
  return effectiveRules.thirdYearPlusVacationDays.max * hoursPerDay;
}

function calculateAutoSickLeave(timesheets: TimesheetEntry[], rules?: PTORules): number {
  // Default PTO rules if none provided
  const defaultRules = {
    firstYearVacationDays: 5,
    secondYearVacationDays: { min: 10, max: 10 },
    thirdYearPlusVacationDays: { min: 15, max: 15 },
    sickLeaveAccrualHours: 40
  };
  
  const effectiveRules = rules || defaultRules;
  const totalWorkedHours = timesheets.reduce((total, timesheet) => {
    // Only count approved timesheets
    if (timesheet.status === 'approved') {
      return total + timesheet.totalHours;
    }
    return total;
  }, 0);
  
  return Math.floor(totalWorkedHours / effectiveRules.sickLeaveAccrualHours);
}

export function getVacationBalance(employee: Employee, rules?: PTORules): number {
  // Check if employee has manual allocation
  if (employee.ptoAllocation?.vacation?.type === 'manual') {
    return employee.ptoAllocation.vacation.hours || 0;
  }
  return calculateAutoVacation(employee.startDate, rules);
}

export function getSickLeaveBalance(employee: Employee, timesheets: TimesheetEntry[], rules?: PTORules): number {
  // Check if employee has manual allocation
  if (employee.ptoAllocation?.sickLeave?.type === 'manual') {
    return employee.ptoAllocation.sickLeave.hours || 0;
  }
  return calculateAutoSickLeave(timesheets, rules);
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
