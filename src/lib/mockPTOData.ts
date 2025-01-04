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
  }
];