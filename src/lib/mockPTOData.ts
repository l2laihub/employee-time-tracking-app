import { PTORequest } from './types';
import { subDays } from 'date-fns';

export const mockPTORequests: PTORequest[] = [
  {
    id: '0',
    userId: '4', // John Smith's ID
    startDate: '2024-01-19',
    endDate: '2024-01-23',
    type: 'vacation',
    hours: 40,
    reason: 'Family wedding',
    status: 'approved',
    notes: 'Approved',
    createdAt: subDays(new Date(), 15).toISOString(),
    reviewedBy: '1',
    reviewedAt: subDays(new Date(), 14).toISOString()
  },
  {
    id: '1',
    userId: '2',
    startDate: '2024-01-15',
    endDate: '2024-01-17',
    type: 'vacation',
    hours: 24,
    reason: 'Family vacation',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    userId: '2',
    startDate: '2024-02-01',
    endDate: '2024-02-02',
    type: 'sick_leave',
    hours: 8,
    reason: 'Medical appointment',
    status: 'approved',
    notes: 'Approved as requested',
    createdAt: new Date().toISOString(),
    reviewedBy: '1',
    reviewedAt: new Date().toISOString()
  },
  {
    id: '4',
    userId: '5',
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    type: 'vacation',
    hours: 16,
    reason: 'Personal days',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    userId: '6',
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    type: 'vacation',
    hours: 40,
    reason: 'Spring break vacation',
    status: 'rejected',
    notes: 'High workload period - please reschedule',
    createdAt: subDays(new Date(), 5).toISOString(),
    reviewedBy: '7',
    reviewedAt: subDays(new Date(), 3).toISOString()
  }
];
