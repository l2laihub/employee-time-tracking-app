import { PTORequest } from './types';

export const mockPTORequests: PTORequest[] = [
  {
    id: '1',
    userId: '2',
    startDate: '2024-01-15',
    endDate: '2024-01-17',
    reason: 'Family vacation',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    userId: '2',
    startDate: '2024-02-01',
    endDate: '2024-02-02',
    reason: 'Medical appointment',
    status: 'approved',
    notes: 'Approved as requested',
    createdAt: new Date().toISOString(),
    reviewedBy: '1',
    reviewedAt: new Date().toISOString()
  },
  {
    id: '3',
    userId: '4',
    startDate: '2024-01-20',
    endDate: '2024-01-24',
    reason: 'Family wedding',
    status: 'approved',
    notes: 'Approved - coverage arranged',
    createdAt: subDays(new Date(), 10).toISOString(),
    reviewedBy: '7',
    reviewedAt: subDays(new Date(), 8).toISOString()
  },
  {
    id: '4',
    userId: '5',
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    reason: 'Personal days',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    userId: '6',
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    reason: 'Spring break vacation',
    status: 'rejected',
    notes: 'High workload period - please reschedule',
    createdAt: subDays(new Date(), 5).toISOString(),
    reviewedBy: '7',
    reviewedAt: subDays(new Date(), 3).toISOString()
  }
];

function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}