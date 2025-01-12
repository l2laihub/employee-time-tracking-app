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
      clockOut: entry.clockOut ? subDays(new Date(entry.clockOut), 14).toISOString() : null
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
  },
  {
    id: '4',
    userId: '4',
    weekStartDate: subDays(new Date(), 7).toISOString(),
    weekEndDate: subDays(new Date(), 1).toISOString(),
    status: 'approved',
    notes: 'Completed mall maintenance ahead of schedule',
    timeEntries: [mockTimeEntries[3]],
    totalHours: 7,
    submittedAt: subDays(new Date(), 5).toISOString(),
    reviewedBy: '1',
    reviewedAt: subDays(new Date(), 4).toISOString()
  },
  {
    id: '5',
    userId: '5',
    weekStartDate: subDays(new Date(), 7).toISOString(),
    weekEndDate: subDays(new Date(), 1).toISOString(),
    status: 'submitted',
    notes: 'Residential plumbing work completed',
    timeEntries: [mockTimeEntries[4]],
    totalHours: 3,
    submittedAt: new Date().toISOString()
  }
];