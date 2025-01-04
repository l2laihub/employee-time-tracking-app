import { DEPARTMENTS } from './constants/departments';
import type { Employee } from './types';

export const mockUsers: Employee[] = [
  {
    id: '1',
    email: 'admin@timetracker.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    department: 'Administration',
    status: 'active'
  },
  {
    id: '2',
    email: 'employee@timetracker.com',
    first_name: 'Employee',
    last_name: 'User',
    role: 'employee',
    department: 'Field Work',
    status: 'active'
  },
  {
    id: '3',
    email: 'manager@timetracker.com',
    first_name: 'Manager',
    last_name: 'User',
    role: 'manager',
    department: 'Management',
    status: 'active'
  }
];