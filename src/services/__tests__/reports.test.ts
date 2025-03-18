import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportsService } from '../reports'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase')

describe('reports service', () => {
  const mockWeeklyHours = {
    id: '1',
    name: 'John Smith',
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total_regular: 40,
    total_ot: 0,
    vacation_hours: 0,
    sick_leave_hours: 0,
    vacation_balance: 80,
    sick_leave_balance: 40
  }

  const mockTimeEntry = {
    clock_in: '2024-01-01T09:00:00Z',
    clock_out: '2024-01-01T17:00:00Z',
    break_start: '2024-01-01T12:00:00Z',
    break_end: '2024-01-01T12:30:00Z',
    total_break_minutes: 30,
    job_locations: { name: 'Main Office' },
    status: 'completed'
  }

  const mockFilters = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07')
  }

  let service: ReportsService

  beforeEach(() => {
    service = new ReportsService()
    vi.resetAllMocks()
  })

  describe('getWeeklyHours', () => {
    it('fetches weekly hours from the view', async () => {
      // Mock auth user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any);

      // Mock organization member query
      const mockMemberBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organization_id: 'org-1' },
          error: null
        })
      } as any;

      // Mock RPC call
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockWeeklyHours],
        error: null
      } as any);

      vi.mocked(supabase.from).mockImplementation(() => mockMemberBuilder);

      const result = await service.getWeeklyHours(mockFilters)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: mockWeeklyHours.id,
        name: mockWeeklyHours.name,
        jobLocationIds: [],
        hours: {
          monday: mockWeeklyHours.monday,
          tuesday: mockWeeklyHours.tuesday,
          wednesday: mockWeeklyHours.wednesday,
          thursday: mockWeeklyHours.thursday,
          friday: mockWeeklyHours.friday,
          saturday: mockWeeklyHours.saturday,
          sunday: mockWeeklyHours.sunday
        },
        totalRegular: mockWeeklyHours.total_regular,
        totalOT: mockWeeklyHours.total_ot,
        vacationHours: mockWeeklyHours.vacation_hours,
        sickLeaveHours: mockWeeklyHours.sick_leave_hours,
        vacationBalance: mockWeeklyHours.vacation_balance,
        sickLeaveBalance: mockWeeklyHours.sick_leave_balance
      })
    })
  })

  describe('getEmployeeDetails', () => {
    it('fetches employee time entries through member relationship', async () => {
      // Mock employee query
      const mockEmployeeBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { member_id: 'member-1' },
          error: null
        })
      } as any

      // Mock member query
      const mockMemberBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user-1' },
          error: null
        })
      } as any

      // Mock time entries query
      const mockTimeEntriesBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockTimeEntry],
          error: null
        })
      } as any

      vi.mocked(supabase.from)
        .mockImplementationOnce(() => mockEmployeeBuilder)
        .mockImplementationOnce(() => mockMemberBuilder)
        .mockImplementationOnce(() => mockTimeEntriesBuilder)

      const result = await service.getEmployeeDetails('1', mockFilters)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        date: '2024-01-01',
        timeIn: '09:00:00',
        timeOut: '17:00:00',
        lunchStart: '12:00:00',
        lunchEnd: '12:30:00',
        totalHours: 8,
        lunchBreak: 0.5,
        workedHours: 7.5,
        jobLocation: mockTimeEntry.job_locations.name,
        status: mockTimeEntry.status
      })
    })
  })
})