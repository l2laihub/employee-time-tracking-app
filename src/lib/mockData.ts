import { addHours, subDays, addDays } from 'date-fns';
import type { JobLocation, TimeEntry, TimesheetEntry } from './types';

export const mockJobLocations: JobLocation[] = [
  {
    id: '1',
    name: 'Desert Ridge Mall',
    type: 'commercial',
    address: '21001 N Tatum Blvd',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85050',
    serviceType: 'hvac',
    isActive: true
  },
  {
    id: '2',
    name: 'Scottsdale Quarter',
    type: 'commercial',
    address: '15059 N Scottsdale Rd',
    city: 'Scottsdale',
    state: 'AZ',
    zip: '85254',
    serviceType: 'both',
    isActive: true
  },
  {
    id: '3',
    name: 'Johnson Residence',
    type: 'residential',
    address: '4521 E McKellips Rd',
    city: 'Mesa',
    state: 'AZ',
    zip: '85215',
    serviceType: 'hvac',
    isActive: true
  },
  {
    id: '4',
    name: 'Paradise Valley Mall',
    type: 'commercial',
    address: '4568 E Cactus Rd',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85032',
    serviceType: 'both',
    isActive: true
  },
  {
    id: '5',
    name: 'Smith Family Home',
    type: 'residential',
    address: '789 W Southern Ave',
    city: 'Tempe',
    state: 'AZ',
    zip: '85282',
    serviceType: 'plumbing',
    isActive: true
  },
  {
    id: '6',
    name: 'Chandler Fashion Center',
    type: 'commercial',
    address: '3111 W Chandler Blvd',
    city: 'Chandler',
    state: 'AZ',
    zip: '85226',
    serviceType: 'hvac',
    isActive: true
  },
  {
    id: '7',
    name: 'Thompson Office Complex',
    type: 'commercial',
    address: '2201 E Camelback Rd',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85016',
    serviceType: 'both',
    isActive: false
  }
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    userId: '2',
    jobLocationId: '1',
    clockIn: subDays(new Date(), 4).toISOString(),
    clockOut: addHours(subDays(new Date(), 4), 6).toISOString(),
    serviceType: 'hvac',
    workDescription: 'Commercial HVAC maintenance - Quarterly inspection and filter replacement',
    status: 'completed'
  },
  {
    id: '2',
    userId: '2',
    jobLocationId: '2',
    clockIn: subDays(new Date(), 3).toISOString(),
    clockOut: addHours(subDays(new Date(), 3), 8).toISOString(),
    serviceType: 'hvac',
    workDescription: 'Emergency repair - Faulty compressor replacement and system testing',
    status: 'completed'
  },
  {
    id: '3',
    userId: '2',
    jobLocationId: '3',
    clockIn: subDays(new Date(), 2).toISOString(),
    clockOut: addHours(subDays(new Date(), 2), 4).toISOString(),
    serviceType: 'hvac',
    workDescription: 'Residential AC tune-up and maintenance',
    status: 'completed'
  },
  {
    id: '4',
    userId: '4',
    jobLocationId: '4',
    clockIn: subDays(new Date(), 2).toISOString(),
    clockOut: addHours(subDays(new Date(), 2), 7).toISOString(),
    serviceType: 'both',
    workDescription: 'Mall-wide HVAC inspection and plumbing maintenance',
    status: 'completed'
  },
  {
    id: '5',
    userId: '5',
    jobLocationId: '5',
    clockIn: subDays(new Date(), 1).toISOString(),
    clockOut: addHours(subDays(new Date(), 1), 3).toISOString(),
    serviceType: 'plumbing',
    workDescription: 'Water heater replacement and system testing',
    status: 'completed'
  },
  {
    id: '6',
    userId: '6',
    jobLocationId: '6',
    clockIn: new Date().toISOString(),
    clockOut: null,
    serviceType: 'hvac',
    workDescription: 'Ongoing maintenance - Air handler unit repair',
    status: 'in-progress'
  }
];

// Employee start dates mapping
export const employeeStartDates: { [key: string]: string } = {
  '2': '2023-06-15', // Employee User
  '4': '2022-08-20', // John Smith
  '5': '2023-01-10', // Sarah Wilson
  '6': '2023-09-01', // Mike Johnson
  '7': '2021-11-15', // Lisa Brown
  '8': '2024-10-20' // Bon Bon - Started 3 months ago
};

// Employee names mapping
export const employeeNames: { [key: string]: string } = {
  '2': 'John Doe',
  '4': 'Jane Smith',
  '5': 'Mike Johnson',
  '6': 'Sarah Wilson',
  '7': 'Lisa Brown',
  '8': 'Bon Bon'
};

const createEmployeeTimesheet = (userId: string, weekOffset: number): TimesheetEntry => {
  const employeeName = employeeNames[userId] || 'Unknown Employee';
  const now = new Date('2025-01-20T23:59:59.999Z'); // Use consistent now time
  const startDate = new Date(employeeStartDates[userId] || new Date());
  
  // Calculate week dates from start date
  const weekStartDate = addDays(startDate, weekOffset * 7);
  const weekEndDate = addDays(weekStartDate, 7);
  
  // Ensure dates are at midnight for consistent comparison
  startDate.setHours(0, 0, 0, 0);
  weekStartDate.setHours(0, 0, 0, 0);
  weekEndDate.setHours(0, 0, 0, 0);
  
  console.log('\n=== Creating Timesheet ===');
  console.log('Employee:', employeeName);
  console.log('Week Start:', weekStartDate.toISOString());
  console.log('Week End:', weekEndDate.toISOString());
  console.log('Employee Start Date:', startDate.toISOString());
  console.log('Week Offset:', weekOffset);
  
  // For timesheets in the future
  if (weekStartDate > now) {
    console.log('Skipping: Future week');
    return {
      id: `ts-${userId}-${weekOffset}`,
      userId,
      employeeName,
      weekStartDate: weekStartDate.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      status: 'pending',
      notes: 'Future timesheet - no hours yet',
      timeEntries: [],
      totalHours: 0,
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null
    };
  }
  
  // For current employees, calculate hours based on time since start
  let hours = 0;
  const monthsSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  console.log('Months since start:', monthsSinceStart.toFixed(2));
  
  // Only assign hours if this timesheet's week has already occurred
  if (weekEndDate <= now) {
    if (monthsSinceStart <= 1) {
      // First month: 15-20 hours per week (training period)
      hours = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
      console.log('Training period - hours:', hours);
    } else {
      // After first month: 32-40 hours per week
      hours = Math.floor(Math.random() * (40 - 32 + 1)) + 32;
      console.log('Regular period - hours:', hours);
    }
  }
  
  // For partial weeks (when week crosses month boundary)
  if (monthsSinceStart <= 1 && weekEndDate > addDays(startDate, 30)) {
    const daysInTraining = Math.max(0, Math.min(5, Math.floor((addDays(startDate, 30).getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))));
    const daysAfterTraining = 5 - daysInTraining;
    
    const trainingHours = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
    const regularHours = Math.floor(Math.random() * (40 - 32 + 1)) + 32;
    
    hours = Math.floor((trainingHours * daysInTraining + regularHours * daysAfterTraining) / 5);
    console.log(`Mixed week - ${daysInTraining} training days, ${daysAfterTraining} regular days - hours: ${hours}`);
  }
  
  // Generate time entries for this timesheet
  const timeEntries: TimeEntry[] = [];
  if (hours > 0) {
    const daysInWeek = 5; // Monday to Friday
    const baseHours = Math.ceil(hours / daysInWeek);
    let remainingHours = hours;
    
    for (let i = 0; i < daysInWeek && remainingHours > 0; i++) {
      const entryDate = addDays(weekStartDate, i);
      // Skip entries after today
      if (entryDate > now) {
        console.log(`Skipping day ${i + 1}: ${entryDate.toISOString()}`);
        continue;
      }
      
      const hoursForDay = Math.min(baseHours, remainingHours);
      const clockIn = new Date(entryDate);
      clockIn.setHours(9, 0, 0, 0); // 9:00 AM
      const clockOut = new Date(clockIn);
      clockOut.setHours(clockIn.getHours() + hoursForDay);
      
      console.log(`Day ${i + 1}: ${entryDate.toISOString()} - ${hoursForDay} hours`);
      
      timeEntries.push({
        id: `te-${userId}-${weekOffset}-${i}`,
        userId,
        jobLocationId: mockJobLocations[i % mockJobLocations.length].id,
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        serviceType: mockJobLocations[i % mockJobLocations.length].serviceType,
        workDescription: `Daily work at ${mockJobLocations[i % mockJobLocations.length].name}`,
        status: 'completed'
      });
      
      remainingHours -= hoursForDay;
    }
  }
  
  const finalTimesheet = {
    id: `ts-${userId}-${weekOffset}`,
    userId,
    employeeName,
    weekStartDate: weekStartDate.toISOString(),
    weekEndDate: weekEndDate.toISOString(),
    status: hours > 0 ? 'approved' : 'pending',
    notes: hours > 0 ? 'Regular work week' : 'No hours worked',
    timeEntries,
    totalHours: hours,
    submittedAt: hours > 0 ? subDays(now, 1).toISOString() : null,
    reviewedBy: hours > 0 ? '1' : null,
    reviewedAt: hours > 0 ? now.toISOString() : null
  };
  
  console.log('\nFinal Timesheet:', {
    id: finalTimesheet.id,
    startDate: finalTimesheet.weekStartDate,
    endDate: finalTimesheet.weekEndDate,
    status: finalTimesheet.status,
    hours: finalTimesheet.totalHours,
    entries: finalTimesheet.timeEntries.length,
    weekOffset
  });
  
  return finalTimesheet;
};

// Generate timesheets for each employee
const generateEmployeeTimesheets = (userId: string): TimesheetEntry[] => {
  // Only generate timesheets from employee start date
  const startDate = new Date(employeeStartDates[userId] || new Date());
  const now = new Date('2025-01-20T23:59:59.999Z'); // Use consistent now time
  
  // Ensure dates are at midnight for consistent comparison
  startDate.setHours(0, 0, 0, 0);
  
  // Calculate how many weeks to generate
  const weeksSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const weeksToGenerate = Math.min(16, Math.max(0, weeksSinceStart));
  
  console.log('\n=== Generating Timesheets ===');
  console.log('Employee:', employeeNames[userId]);
  console.log('Start Date:', startDate.toISOString());
  console.log('Today:', now.toISOString());
  console.log('Weeks Since Start:', weeksSinceStart);
  console.log('Weeks to Generate:', weeksToGenerate);
  
  // If employee hasn't started yet, return empty timesheets
  if (startDate > now) {
    console.log('Employee has not started yet');
    return [];
  }
  
  // Generate timesheets starting from the employee's start date
  const timesheets = Array.from({ length: weeksToGenerate }, (_, i) => {
    return createEmployeeTimesheet(userId, i);
  });
  
  const totalHours = timesheets.reduce((total, ts) => total + ts.totalHours, 0);
  console.log('\nTotal hours generated:', totalHours);
  console.log('Expected sick leave hours:', Math.floor(totalHours / 40));
  
  return timesheets;
};

// Create timesheets for all employees
export const mockTimesheets: TimesheetEntry[] = [
  // Employee User (id: '2') - Started 2023-06-15
  ...generateEmployeeTimesheets('2'),
  
  // John Smith (id: '4') - Started 2022-08-20
  ...generateEmployeeTimesheets('4'),
  
  // Sarah Wilson (id: '5') - Started 2023-01-10
  ...generateEmployeeTimesheets('5'),
  
  // Mike Johnson (id: '6') - Started 2023-09-01
  ...generateEmployeeTimesheets('6'),
  
  // Lisa Brown (id: '7') - Started 2021-11-15
  ...generateEmployeeTimesheets('7'),
  
  // Bon Bon - Started 2024-10-20
  ...generateEmployeeTimesheets('8')
];
