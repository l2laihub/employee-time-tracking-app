export const DEPARTMENTS = [
  'Administration',
  'Management',
  'Office',
  'Field Work',
  'Human Resources',
  'Finance',
  'Customer Service'
] as const;

export type Department = typeof DEPARTMENTS[number];