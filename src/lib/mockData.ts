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
  }
];

// Create mock timesheets for the past few weeks
export const mockTimesheets: TimesheetEntry[] = [
  {
    id: '1',
    userId: '2',
    weekStartDate: subDays(new Date(), 14).toISOString(),
    weekEndDate: subDays(new Date(), 8).toISOString(),
    status: 'approved',
    notes: 'Completed all scheduled maintenance tasks and emergency repairs',
    timeEntries: mockTimeEntries.map(entry => ({
      ...entry,
      clockIn: subDays(new Date(entry.clockIn), 14).toISOString(),
      clockOut: subDays(new Date(entry.clockOut!), 14).toISOString()
    })),
    totalHours: 18,
    submittedAt: subDays(new Date(), 7).toISOString(),
    reviewedBy: '1',
    reviewedAt: subDays(new Date(), 6).toISOString()
  },
  {
    id: '2',
    userId: '2',
    weekStartDate: subDays(new Date(), 7).toISOString(),
    weekEndDate: subDays(new Date(), 1).toISOString(),
    status: 'submitted',
    notes: 'Multiple emergency calls handled successfully',
    timeEntries: mockTimeEntries,
    totalHours: 18,
    submittedAt: new Date().toISOString()
  },
  {
    id: '3',
    userId: '2',
    weekStartDate: new Date().toISOString(),
    weekEndDate: addDays(new Date(), 6).toISOString(),
    status: 'draft',
    notes: '',
    timeEntries: [mockTimeEntries[0]],
    totalHours: 6
  }
];