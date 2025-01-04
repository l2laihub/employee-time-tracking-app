// Add to existing types.ts
export interface PTORequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Add to existing Employee interface
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'inactive';
  department?: string;
  ptoBalance?: number; // Add PTO balance
}