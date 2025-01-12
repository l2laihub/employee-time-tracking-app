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
  },
  {
    id: '4',
    email: 'john.smith@timetracker.com',
    first_name: 'John',
    last_name: 'Smith',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    phone: '480-555-0101'
  },
  {
    id: '5',
    email: 'sarah.wilson@timetracker.com',
    first_name: 'Sarah',
    last_name: 'Wilson',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    phone: '480-555-0102'
  },
  {
    id: '6',
    email: 'mike.johnson@timetracker.com',
    first_name: 'Mike',
    last_name: 'Johnson',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    phone: '480-555-0103'
  },
  {
    id: '7',
    email: 'lisa.brown@timetracker.com',
    first_name: 'Lisa',
    last_name: 'Brown',
    role: 'manager',
    department: 'Management',
    status: 'active',
    phone: '480-555-0104'
  }
];