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

// Create mock timesheets with consistent hours for proper PTO calculation
const createEmployeeTimesheet = (userId: string, weekOffset: number): TimesheetEntry => {
  // Calculate hours based on start date to avoid excessive sick leave accrual
  const now = new Date();
  const weekStartDate = subDays(now, (weekOffset + 1) * 7);
  
  // Only give hours for dates after employee start date
  const employeeStartDates: { [key: string]: string } = {
    '2': '2023-06-15', // Employee User
    '4': '2022-08-20', // John Smith
    '5': '2023-01-10', // Sarah Wilson
    '6': '2023-09-01'  // Mike Johnson
  };

  const startDate = new Date(employeeStartDates[userId]);
  
  // Randomize hours between 32-40 to make sick leave accrual more realistic
  const hours = weekStartDate >= startDate ? Math.floor(Math.random() * (40 - 32 + 1)) + 32 : 0;

  return {
    id: `ts-${userId}-${weekOffset}`,
    userId,
    weekStartDate: weekStartDate.toISOString(),
    weekEndDate: subDays(now, weekOffset * 7).toISOString(),
    status: 'approved',
    notes: 'Regular work week',
    timeEntries: [],
    totalHours: hours,
    submittedAt: subDays(now, weekOffset * 7 - 1).toISOString(),
    reviewedBy: '1',
    reviewedAt: subDays(now, weekOffset * 7 - 2).toISOString()
  };
};

// Generate 8 weeks of timesheets for each employee (2 months of history)
const generateEmployeeTimesheets = (userId: string): TimesheetEntry[] => {
  return Array.from({ length: 8 }, (_, i) => createEmployeeTimesheet(userId, i));
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
  ...generateEmployeeTimesheets('6')
];
