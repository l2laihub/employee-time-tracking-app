export interface WeeklyEmployeeHours {
  id: string;
  name: string;
  hours: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  totalRegular: number;
  totalOT: number;
  vacationHours: number;
  sickLeaveHours: number;
  vacationBalance: number;
  sickLeaveBalance: number;
}

export interface EmployeeTimeEntry {
  date: string;
  timeIn: string;
  lunchStart: string;
  lunchEnd: string;
  timeOut: string;
  totalHours: number;
  lunchBreak: number;
  workedHours: number;
  jobLocation: string;
  status: string;
}

export const jobLocations = [
  {
    id: 'loc1',
    name: 'Desert Ridge Mall',
    address: '21001 N Tatum Blvd, Phoenix, AZ 85050'
  },
  {
    id: 'loc2',
    name: 'Scottsdale Quarter',
    address: '15059 N Scottsdale Rd, Scottsdale, AZ 85254'
  },
  {
    id: 'loc3',
    name: 'Johnson Residence',
    address: '4521 E McKellips Rd, Mesa, AZ 85215'
  }
];

// Updated mock data with current week dates
export const weeklyEmployeeHours: WeeklyEmployeeHours[] = [
  {
    id: '1',
    name: 'John Smith',
    hours: {
      monday: 8,
      tuesday: 8,
      wednesday: 8,
      thursday: 8,
      friday: 8,
      saturday: 0,
      sunday: 0
    },
    totalRegular: 40,
    totalOT: 0,
    vacationHours: 0,
    sickLeaveHours: 0,
    vacationBalance: 80,
    sickLeaveBalance: 40
  },
  {
    id: '2',
    name: 'Jane Doe',
    hours: {
      monday: 9,
      tuesday: 9,
      wednesday: 9,
      thursday: 9,
      friday: 9,
      saturday: 0,
      sunday: 0
    },
    totalRegular: 40,
    totalOT: 5,
    vacationHours: 0,
    sickLeaveHours: 0,
    vacationBalance: 80,
    sickLeaveBalance: 45
  },
  {
    id: '3',
    name: 'Mike Johnson',
    hours: {
      monday: 8,
      tuesday: 8,
      wednesday: 0,
      thursday: 8,
      friday: 8,
      saturday: 0,
      sunday: 0
    },
    totalRegular: 32,
    totalOT: 0,
    vacationHours: 8,
    sickLeaveHours: 0,
    vacationBalance: 72,
    sickLeaveBalance: 32
  }
];

// Updated mock data with current dates
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth();
const currentDay = currentDate.getDate();

export const employeeDetailedHours: Record<string, EmployeeTimeEntry[]> = {
  '1': [
    {
      date: new Date(currentYear, currentMonth, currentDay).toISOString(),
      timeIn: '8:00 AM',
      lunchStart: '12:00 PM',
      lunchEnd: '12:30 PM',
      timeOut: '4:30 PM',
      totalHours: 8.50,
      lunchBreak: 0.50,
      workedHours: 8.00,
      jobLocation: 'Desert Ridge Mall',
      status: 'Approved'
    },
    {
      date: new Date(currentYear, currentMonth, currentDay - 1).toISOString(),
      timeIn: '8:00 AM',
      lunchStart: '12:00 PM',
      lunchEnd: '12:30 PM',
      timeOut: '4:30 PM',
      totalHours: 8.50,
      lunchBreak: 0.50,
      workedHours: 8.00,
      jobLocation: 'Desert Ridge Mall',
      status: 'Approved'
    }
  ],
  '2': [
    {
      date: new Date(currentYear, currentMonth, currentDay).toISOString(),
      timeIn: '7:30 AM',
      lunchStart: '11:30 AM',
      lunchEnd: '12:00 PM',
      timeOut: '5:00 PM',
      totalHours: 9.50,
      lunchBreak: 0.50,
      workedHours: 9.00,
      jobLocation: 'Scottsdale Quarter',
      status: 'Approved'
    },
    {
      date: new Date(currentYear, currentMonth, currentDay - 1).toISOString(),
      timeIn: '7:30 AM',
      lunchStart: '11:30 AM',
      lunchEnd: '12:00 PM',
      timeOut: '5:00 PM',
      totalHours: 9.50,
      lunchBreak: 0.50,
      workedHours: 9.00,
      jobLocation: 'Scottsdale Quarter',
      status: 'Approved'
    }
  ],
  '3': [
    {
      date: new Date(currentYear, currentMonth, currentDay).toISOString(),
      timeIn: '8:00 AM',
      lunchStart: '12:00 PM',
      lunchEnd: '12:30 PM',
      timeOut: '4:30 PM',
      totalHours: 8.50,
      lunchBreak: 0.50,
      workedHours: 8.00,
      jobLocation: 'Johnson Residence',
      status: 'Approved'
    },
    {
      date: new Date(currentYear, currentMonth, currentDay - 2).toISOString(),
      timeIn: '8:00 AM',
      lunchStart: '12:00 PM',
      lunchEnd: '12:30 PM',
      timeOut: '4:30 PM',
      totalHours: 8.50,
      lunchBreak: 0.50,
      workedHours: 8.00,
      jobLocation: 'Johnson Residence',
      status: 'Pending'
    }
  ]
};
