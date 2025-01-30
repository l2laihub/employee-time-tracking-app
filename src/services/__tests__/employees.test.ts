import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  createEmployee,
  updateEmployee,
  listEmployees,
  getEmployee,
  getEmployeesByDepartment,
  updateEmployeePTO
} from '../employees';

// Create a proper mock implementation that chains methods correctly
const createMockQueryBuilder = (mockResponse: any) => ({
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(mockResponse),
  from: vi.fn().mockReturnThis(),
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('Employee Service', () => {
  const mockEmployee = {
    id: '1',
    organization_id: 'org123',
    member_id: 'member123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'employee',
    status: 'active',
    start_date: '2023-01-01',
    department: 'Engineering',
    pto: {
      total: 0,
      used: 0,
      remaining: 0
    }
  };

  const mockOrganizationId = 'org123';
  const mockUserId = 'user123';
  const mockMemberId = 'member123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('should create an employee successfully', async () => {
      // Mock auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      } as any);

      // Mock member lookup
      const mockMemberResponse = { data: { id: mockMemberId }, error: null };
      vi.mocked(supabase.from).mockImplementationOnce(() => 
        createMockQueryBuilder(mockMemberResponse)
      );

      // Mock employee creation
      const mockEmployeeResponse = { data: mockEmployee, error: null };
      vi.mocked(supabase.from).mockImplementationOnce(() => 
        createMockQueryBuilder(mockEmployeeResponse)
      );

      const result = await createEmployee(mockOrganizationId, mockEmployee);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEmployee);
    });

    it('should handle errors when creating an employee', async () => {
      // Mock auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      } as any);

      // Mock member lookup (success)
      const mockMemberResponse = { data: { id: mockMemberId }, error: null };
      vi.mocked(supabase.from).mockImplementationOnce(() => 
        createMockQueryBuilder(mockMemberResponse)
      );

      // Mock employee creation (error)
      const mockError = new Error('Creation failed');
      const mockErrorResponse = { data: null, error: mockError };
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        ...createMockQueryBuilder(mockErrorResponse),
        single: vi.fn().mockResolvedValue(mockErrorResponse)
      }));

      const result = await createEmployee(mockOrganizationId, mockEmployee);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
    });

    it('should create employee without member_id when no user is authenticated', async () => {
      // Mock auth.getUser (no user)
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      } as any);

      // Mock employee creation
      const employeeWithoutMember = { ...mockEmployee, member_id: null };
      const mockResponse = { data: employeeWithoutMember, error: null };
      vi.mocked(supabase.from).mockImplementationOnce(() => 
        createMockQueryBuilder(mockResponse)
      );

      const result = await createEmployee(mockOrganizationId, mockEmployee);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(employeeWithoutMember);
    });
  });

  describe('updateEmployee', () => {
    it('should update an employee successfully', async () => {
      const mockResponse = { data: mockEmployee, error: null };
      vi.mocked(supabase.from).mockImplementation(() => createMockQueryBuilder(mockResponse));

      const result = await updateEmployee('1', { status: 'inactive' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEmployee);
    });
  });

  describe('listEmployees', () => {
    it('should list all employees for an organization', async () => {
      const mockResponse = { data: [mockEmployee], error: null };
      vi.mocked(supabase.from).mockImplementation(() => ({
        ...createMockQueryBuilder(mockResponse),
        order: vi.fn().mockResolvedValue(mockResponse)
      }));

      const result = await listEmployees(mockOrganizationId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockEmployee]);
    });
  });

  describe('getEmployee', () => {
    it('should get a single employee by id', async () => {
      const mockResponse = { data: mockEmployee, error: null };
      vi.mocked(supabase.from).mockImplementation(() => createMockQueryBuilder(mockResponse));

      const result = await getEmployee('1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEmployee);
    });
  });

  describe('getEmployeesByDepartment', () => {
    it('should get employees by department', async () => {
      const mockResponse = { data: [mockEmployee], error: null };
      vi.mocked(supabase.from).mockImplementation(() => ({
        ...createMockQueryBuilder(mockResponse),
        order: vi.fn().mockResolvedValue(mockResponse)
      }));

      const result = await getEmployeesByDepartment(mockOrganizationId, 'Engineering');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockEmployee]);
    });
  });

  describe('updateEmployeePTO', () => {
    const mockPTOUpdate = {
      total: 20,
      used: 5,
      remaining: 15
    };

    it('should update employee PTO successfully', async () => {
      const mockResponse = { 
        data: { ...mockEmployee, pto: mockPTOUpdate }, 
        error: null 
      };
      vi.mocked(supabase.from).mockImplementation(() => createMockQueryBuilder(mockResponse));

      const result = await updateEmployeePTO('1', mockPTOUpdate);
      expect(result.success).toBe(true);
      expect(result.data?.pto).toEqual(mockPTOUpdate);
    });
  });
});
