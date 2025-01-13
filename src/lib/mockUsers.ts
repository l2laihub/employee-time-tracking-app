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
    status: 'active',
    startDate: '2020-01-15' // >3 years
  },
  {
    id: '2',
    email: 'employee@timetracker.com',
    first_name: 'Employee',
    last_name: 'User',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    startDate: '2023-06-15' // <1 year
  },
  {
    id: '3',
    email: 'manager@timetracker.com',
    first_name: 'Manager',
    last_name: 'User',
    role: 'manager',
    department: 'Management',
    status: 'active',
    startDate: '2021-03-10' // >2 years
  },
  {
    id: '4',
    email: 'john.smith@timetracker.com',
    first_name: 'John',
    last_name: 'Smith',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    phone: '480-555-0101',
    startDate: '2022-08-20' // ~1.5 years
  },
  {
    id: '5',
    email: 'sarah.wilson@timetracker.com',
    first_name: 'Sarah',
    last_name: 'Wilson',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    phone: '480-555-0102',
    startDate: '2023-01-10' // ~1 year
  },
  {
    id: '6',
    email: 'mike.johnson@timetracker.com',
    first_name: 'Mike',
    last_name: 'Johnson',
    role: 'employee',
    department: 'Field Work',
    status: 'active',
    phone: '480-555-0103',
    startDate: '2023-09-01' // <6 months
  },
  {
    id: '7',
    email: 'lisa.brown@timetracker.com',
    first_name: 'Lisa',
    last_name: 'Brown',
    role: 'manager',
    department: 'Management',
    status: 'active',
    phone: '480-555-0104',
    startDate: '2021-11-15' // >2 years
  }
];
