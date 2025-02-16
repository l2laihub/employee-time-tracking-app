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

import type { User } from '@supabase/supabase-js';
import type { Employee } from '../../lib/types';

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  headers: Record<string, string>;
  url: URL;
};

// Create a proper mock implementation that chains methods correctly
const createMockQueryBuilder = (mockResponse: { data: unknown; error: Error | null }): MockQueryBuilder => {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(mockResponse),
    single: vi.fn().mockResolvedValue(mockResponse),
    from: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnThis(),
    headers: {},
    url: new URL('http://example.com')
  };
};

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn()
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
    role: 'admin' as const,
    status: 'active' as const,
    start_date: '2023-01-01',
    department: 'Engineering',
    pto: {
      vacation: {
        beginningBalance: 0,
        ongoingBalance: 0,
        firstYearRule: 40,
        used: 0
      },
      sickLeave: {
        beginningBalance: 0,
        used: 0
      }
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
      const mockUser: User = {
        id: mockUserId,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01',
        role: '',
        email: 'test@example.com',
        phone: '',
        confirmation_sent_at: '',
        confirmed_at: '',
        last_sign_in_at: '',
        recovery_sent_at: '',
        updated_at: '',
        identities: [],
        factors: []
      };

      // Mock auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock member lookup
      const mockMemberResponse = { data: { id: mockMemberId }, error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockMemberResponse)
      );

      // Mock employee creation
      const mockEmployeeResponse = { data: mockEmployee, error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockEmployeeResponse)
      );

      const result = await createEmployee(mockOrganizationId, mockEmployee);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEmployee);
    });

    it('should handle errors when creating an employee', async () => {
      const mockUser: User = {
        id: mockUserId,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01',
        role: '',
        email: 'test@example.com',
        phone: '',
        confirmation_sent_at: '',
        confirmed_at: '',
        last_sign_in_at: '',
        recovery_sent_at: '',
        updated_at: '',
        identities: [],
        factors: []
      };

      // Mock auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock member lookup (success)
      const mockMemberResponse = { data: { id: mockMemberId }, error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockMemberResponse)
      );

      // Mock employee creation (error)
      const mockError = new Error('Creation failed');
      const mockErrorResponse = { data: null, error: mockError };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockErrorResponse)
      );

      const result = await createEmployee(mockOrganizationId, mockEmployee);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
    });

    it('should create employee without member_id when no user is authenticated', async () => {
      // Mock auth.getUser (no user)
      const mockAuthResponse = {
        data: { user: null },
        error: null
      };
      vi.mocked(supabase.auth.getUser).mockResolvedValue(mockAuthResponse as unknown as { data: { user: User }; error: null });

      // Mock employee creation
      const employeeWithoutMember = { ...mockEmployee, member_id: null };
      const mockResponse = { data: employeeWithoutMember, error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockResponse)
      );

      const result = await createEmployee(mockOrganizationId, mockEmployee);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(employeeWithoutMember);
    });
  });

  describe('updateEmployee', () => {
    it('should update an employee successfully', async () => {
      const updates = {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '123-456-7890'
      };

      const updatedEmployee = { ...mockEmployee, ...updates };

      // Mock the auth session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: 'test-user-id',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: '2023-01-01',
              role: '',
              email: 'test@example.com',
              phone: '',
              confirmation_sent_at: '',
              confirmed_at: '',
              last_sign_in_at: '',
              recovery_sent_at: '',
              updated_at: '',
              identities: [],
              factors: []
            }
          }
        },
        error: null
      });

      // Mock the employee lookup
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder({ data: { email: updates.email }, error: null })
      );
      // Mock RPC calls - handle both user settings and basic info updates
      vi.mocked(supabase.rpc).mockImplementation((functionName: string) => {
        if (functionName === 'update_user_basic_info') {
          return {
            data: [updatedEmployee],
            error: null,
            count: null,
            status: 200,
            statusText: 'OK'
          };
        }
        return {
          data: null,
          error: null,
          count: null,
          status: 200,
          statusText: 'OK'
        };
      });

      const result = await updateEmployee('1', updates);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedEmployee);
    });
  });

  describe('listEmployees', () => {
    it('should list all employees for an organization', async () => {
      const mockResponse = { data: [mockEmployee], error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockResponse)
      );

      const result = await listEmployees(mockOrganizationId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockEmployee]);
    });
  });

  describe('getEmployee', () => {
    it('should get a single employee by id', async () => {
      const mockResponse = { data: mockEmployee, error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockResponse)
      );

      const result = await getEmployee('1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEmployee);
    });
  });

  describe('getEmployeesByDepartment', () => {
    it('should get employees by department', async () => {
      const mockResponse = { data: [mockEmployee], error: null };
      vi.mocked(supabase.from).mockReturnValue(
        createMockQueryBuilder(mockResponse)
      );

      const result = await getEmployeesByDepartment(mockOrganizationId, 'Engineering');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockEmployee]);
    });
  });

  describe('updateEmployeePTO', () => {
    it('should update employee PTO successfully', async () => {
      const updatedEmployee = {
        ...mockEmployee,
        pto: {
          vacation: {
            beginningBalance: 20,
            ongoingBalance: 10,
            firstYearRule: 40,
            used: 5
          },
          sickLeave: {
            beginningBalance: 10,
            used: 2
          }
        }
      };
      
      // Mock the RPC response
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [updatedEmployee],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      const result = await updateEmployeePTO('1', updatedEmployee.pto);
      expect(result.success).toBe(true);
      expect((result.data as Employee).pto).toEqual(updatedEmployee.pto);
    });
  });
});
