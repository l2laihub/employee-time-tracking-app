import { Employee, TimesheetEntry } from '../lib/types';
import { differenceInYears, differenceInMonths } from 'date-fns';

interface VacationRules {
  firstYearHours: number;  // 40 hours (5 days)
  secondYearOnwardsHours: number;  // 80 hours (10 days)
  hoursPerDay: number;
}

const DEFAULT_VACATION_RULES: VacationRules = {
  firstYearHours: 40,  // 5 days
  secondYearOnwardsHours: 80,  // 10 days
  hoursPerDay: 8
};

function calculateVacationHours(startDate: string, rules: VacationRules = DEFAULT_VACATION_RULES): number {
  const today = new Date();
  const employeeStartDate = new Date(startDate);
  
  // If start date is in the future, return 0
  if (employeeStartDate > today) {
    return 0;
  }

  const yearsOfService = differenceInYears(today, employeeStartDate);
  
  // First year: Pro-rate 40 hours based on months worked
  if (yearsOfService < 1) {
    const monthsWorked = differenceInMonths(today, employeeStartDate);
    // Handle case where months worked is 0 (started today)
    if (monthsWorked <= 0) {
      return 0;
    }
    return Math.floor((rules.firstYearHours * monthsWorked) / 12);
  }
  
  // Second year onwards: 80 hours (10 days)
  return rules.secondYearOnwardsHours;
}

function calculateSickLeaveHours(timesheets: TimesheetEntry[], startDate: string): number {
  const employeeStartDate = new Date(startDate);
  
  const totalWorkedHours = timesheets.reduce((total, timesheet) => {
    // Only count approved timesheets after employee start date
    if (timesheet.status === 'approved' && new Date(timesheet.weekStartDate) >= employeeStartDate) {
      return total + timesheet.totalHours;
    }
    return total;
  }, 0);
  
  // 1 hour of sick leave per 40 hours worked
  return Math.floor(totalWorkedHours / 40);
}

export function getVacationBalance(employee: Employee): number {
  const calculatedHours = calculateVacationHours(employee.startDate);
  return employee.pto.vacation.beginningBalance + 
         employee.pto.vacation.ongoingBalance + 
         calculatedHours;
}

export function getSickLeaveBalance(employee: Employee, timesheets: TimesheetEntry[]): number {
  const calculatedHours = calculateSickLeaveHours(timesheets, employee.startDate);
  return employee.pto.sickLeave.beginningBalance + calculatedHours;
}

export function getVacationAllocationText(employee: Employee): string {
  const yearsOfService = differenceInYears(new Date(), new Date(employee.startDate));
  
  if (yearsOfService < 1) {
    return '5 days (40 hours) per year, pro-rated based on months worked';
  }
  return '10 days (80 hours) per year';
}

export function getSickLeaveAllocationText(): string {
  return '1 hour per 40 hours worked';
}
