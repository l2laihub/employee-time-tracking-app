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
  const today = new Date();
  
  // Ensure dates are at midnight for consistent comparison
  employeeStartDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  console.log('\n=== Calculating Sick Leave Hours ===');
  console.log('Start Date:', employeeStartDate.toISOString());
  console.log('Today:', today.toISOString());
  console.log('Total Timesheets:', timesheets.length);
  
  // If start date is in the future, return 0
  if (employeeStartDate > today) {
    console.log('Start date is in the future, returning 0');
    return 0;
  }
  
  // Calculate weeks between start date and today
  const weeksSinceStart = Math.floor((today.getTime() - employeeStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  console.log('Weeks since start:', weeksSinceStart);
  
  // Sort timesheets by start date to process them in order
  const sortedTimesheets = [...timesheets].sort((a, b) => 
    new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()
  );
  
  // Only count approved timesheets after employee start date and before today
  const totalWorkedHours = sortedTimesheets.reduce((total, timesheet, index) => {
    const timesheetStartDate = new Date(timesheet.weekStartDate);
    const timesheetEndDate = new Date(timesheet.weekEndDate);
    
    // Ensure dates are at midnight for consistent comparison
    timesheetStartDate.setHours(0, 0, 0, 0);
    timesheetEndDate.setHours(0, 0, 0, 0);
    
    console.log('\nProcessing Timesheet:', {
      index,
      id: timesheet.id,
      startDate: timesheetStartDate.toISOString(),
      endDate: timesheetEndDate.toISOString(),
      status: timesheet.status,
      hours: timesheet.totalHours,
      entries: timesheet.timeEntries.length
    });
    
    // Skip timesheets that:
    // 1. Are not approved
    if (timesheet.status !== 'approved') {
      console.log('Skipping: Not approved');
      return total;
    }
    
    // 2. Start before employee's start date
    if (timesheetStartDate < employeeStartDate) {
      console.log('Skipping: Before employee start date');
      return total;
    }
    
    // 3. End after today
    if (timesheetEndDate > today) {
      console.log('Skipping: Future timesheet');
      return total;
    }
    
    // 4. Have no hours or time entries
    if (timesheet.totalHours <= 0 || timesheet.timeEntries.length === 0) {
      console.log('Skipping: No hours or entries');
      return total;
    }
    
    // Validate time entries
    let validatedHours = 0;
    timesheet.timeEntries.forEach((entry, i) => {
      const entryDate = new Date(entry.clockIn);
      const clockInTime = new Date(entry.clockIn);
      const clockOutTime = new Date(entry.clockOut);
      
      // Set entry date to midnight for date comparison
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate >= employeeStartDate && entryDate <= today) {
        const entryHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
        validatedHours += entryHours;
        console.log(`Entry ${i + 1}: ${entryDate.toISOString()} - ${entryHours} hours`);
      } else {
        console.log(`Entry ${i + 1}: Skipped - invalid date ${entryDate.toISOString()}`);
      }
    });
    
    console.log(`Timesheet validated hours: ${validatedHours}`);
    return total + validatedHours;
  }, 0);
  
  console.log('\nTotal worked hours:', totalWorkedHours.toFixed(2));
  const sickLeaveHours = Math.floor(totalWorkedHours / 40);
  console.log('Calculated sick leave hours:', sickLeaveHours);
  return sickLeaveHours;
}

export function getVacationBalance(employee: Employee): number {
  if (!employee.pto?.vacation) {
    return 0;
  }

  const { beginningBalance = 0, ongoingBalance = 0, used = 0 } = employee.pto.vacation;
  
  // Calculate accrued vacation based on time
  const accruedBalance = calculateVacationHours(employee.start_date);
  
  // Total balance is beginning balance + ongoing balance + accrued - used
  return Math.max(0, beginningBalance + ongoingBalance + accruedBalance - used);
}

export function getSickLeaveBalance(employee: Employee, timesheets: TimesheetEntry[]): number {
  // Get beginning balance
  const beginningBalance = employee.pto?.sickLeave?.beginningBalance || 0;
  
  // Calculate accrued sick leave
  const accruedBalance = calculateSickLeaveHours(timesheets, employee.start_date);
  
  // Get used hours (if we implement this feature later)
  const usedHours = employee.pto?.sickLeave?.used || 0;
  
  // Total balance is beginning balance + accrued - used
  return Math.max(0, beginningBalance + accruedBalance - usedHours);
}

export function getVacationAllocationText(employee: Employee): string {
  const yearsOfService = differenceInYears(new Date(), new Date(employee.start_date));
  
  if (yearsOfService < 1) {
    return '5 days (40 hours) per year, pro-rated based on months worked';
  }
  return '10 days (80 hours) per year';
}

export function getSickLeaveAllocationText(): string {
  return '1 hour per 40 hours worked';
}

export function getPTOBalance(employee: Employee, type: 'vacation' | 'sick_leave'): number {
  return type === 'vacation' ? getVacationBalance(employee) : getSickLeaveBalance(employee, []);
}
