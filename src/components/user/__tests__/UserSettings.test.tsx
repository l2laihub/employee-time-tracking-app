import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSettings from '../UserSettings';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useEmployees } from '../../../contexts/EmployeeContext';
import type { Employee } from '../../../lib/types';
import * as employeeService from '../../../services/employees';
import { toast } from 'sonner';

// Mock the hooks
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../contexts/OrganizationContext');
vi.mock('../../../contexts/EmployeeContext');
vi.mock('sonner');
vi.mock('../../../services/employees');

describe('UserSettings', () => {
  const mockEmployee: Employee = {
    id: 'emp-123',
    organization_id: 'org-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    role: 'employee',
    department: 'Engineering',
    start_date: '2024-01-01',
    status: 'active',
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

  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();

    // Mock auth
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'user-123' },
      loading: false
    });

    // Mock organization
    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({
      organization: { id: 'org-123' },
      loading: false
    });


    // Mock employees context
    const mockUpdateEmployee = vi.fn().mockResolvedValue({ success: true });
    const mockRefreshEmployees = vi.fn().mockResolvedValue(undefined);

    (useEmployees as ReturnType<typeof vi.fn>).mockReturnValue({
      employees: [mockEmployee],
      isLoading: false,
      error: null,
      updateEmployee: mockUpdateEmployee,
      refreshEmployees: mockRefreshEmployees
    });

    // Mock toast
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'error');
  });

  it('renders form with employee data', async () => {
    // Setup mock for this test
    (employeeService.getEmployeeByUserId as ReturnType<typeof vi.fn>).mockImplementation(() => 
      Promise.resolve({
        success: true,
        data: { ...mockEmployee }
      })
    );

    render(<UserSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Doe');
      expect(screen.getByLabelText(/Email/i)).toHaveValue('john@example.com');
      expect(screen.getByLabelText(/Phone/i)).toHaveValue('123-456-7890');
    });

    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('employee')).toBeInTheDocument();
  });

  it('updates employee data successfully', async () => {
    const { updateEmployee, refreshEmployees } = useEmployees();
    const updatedEmployee = {
      ...mockEmployee,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    // Setup mock for this test
    let callCount = 0;
    (employeeService.getEmployeeByUserId as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        data: callCount === 1 ? { ...mockEmployee } : updatedEmployee
      });
    });

    render(<UserSettings />);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    });

    // Update fields
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Smith' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitButton);

    // Verify update
    await waitFor(() => {
      expect(updateEmployee).toHaveBeenCalledWith(mockEmployee.id, {
        first_name: 'Jane',
        last_name: 'Smith',
        email: mockEmployee.email,
        phone: mockEmployee.phone
      });
      expect(refreshEmployees).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Settings updated successfully');
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('Jane');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Smith');
    });
  });

  it('shows error on update failure', async () => {
    const { updateEmployee } = useEmployees();
    (updateEmployee as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Update failed'));

    // Setup mock for this test
    (employeeService.getEmployeeByUserId as ReturnType<typeof vi.fn>).mockImplementation(() => 
      Promise.resolve({
        success: true,
        data: { ...mockEmployee }
      })
    );

    render(<UserSettings />);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update settings. Please try again.');
      // Form should retain original values
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/Last Name/i)).toHaveValue('Doe');
    });
  });

  it('shows loading state during submission', async () => {
    const { updateEmployee } = useEmployees();
    (updateEmployee as ReturnType<typeof vi.fn>).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    // Setup mock for this test
    (employeeService.getEmployeeByUserId as ReturnType<typeof vi.fn>).mockImplementation(() => 
      Promise.resolve({
        success: true,
        data: { ...mockEmployee }
      })
    );

    render(<UserSettings />);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitButton);

    // Check loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  it('validates required fields', async () => {
    const { updateEmployee } = useEmployees();
    
    // Setup mock for this test
    (employeeService.getEmployeeByUserId as ReturnType<typeof vi.fn>).mockImplementation(() => 
      Promise.resolve({
        success: true,
        data: { ...mockEmployee }
      })
    );
    
    render(<UserSettings />);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toHaveValue('John');
    });

    // Clear required fields
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitButton);

    expect(updateEmployee).not.toHaveBeenCalled();
  });
});
