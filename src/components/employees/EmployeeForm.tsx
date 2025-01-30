import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { DEPARTMENTS } from '../../lib/constants/departments';
import type { Employee } from '../../lib/types';
import { formatDateForInput, getTodayForInput } from '../../utils/dateUtils';

interface EmployeeFormProps {
  employee: Employee | null;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id' | 'organization_id' | 'member_id' | 'created_at' | 'updated_at' | 'organization_members'>) => Promise<void>;
}

export default function EmployeeForm({ 
  employee, 
  onClose, 
  onSubmit
}: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'employee' as Employee['role'],
    department: '',
    status: 'active' as 'active' | 'inactive',
    start_date: getTodayForInput(),
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
  });

  const [firstYearRuleInput, setFirstYearRuleInput] = useState<string>('40');
  const [vacationBeginningBalanceInput, setVacationBeginningBalanceInput] = useState<string>('0');
  const [vacationOngoingBalanceInput, setVacationOngoingBalanceInput] = useState<string>('0');
  const [sickLeaveBalanceInput, setSickLeaveBalanceInput] = useState<string>('0');

  // Reset form data when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role,
        department: employee.department || '',
        status: employee.status,
        start_date: formatDateForInput(employee.start_date),
        pto: {
          vacation: {
            beginningBalance: employee.pto.vacation.beginningBalance,
            ongoingBalance: employee.pto.vacation.ongoingBalance,
            firstYearRule: employee.pto.vacation.firstYearRule,
            used: employee.pto.vacation.used
          },
          sickLeave: {
            beginningBalance: employee.pto.sickLeave.beginningBalance,
            used: employee.pto.sickLeave.used
          }
        }
      });
      setFirstYearRuleInput(String(employee.pto.vacation.firstYearRule));
      setVacationBeginningBalanceInput(String(employee.pto.vacation.beginningBalance));
      setVacationOngoingBalanceInput(String(employee.pto.vacation.ongoingBalance));
      setSickLeaveBalanceInput(String(employee.pto.sickLeave.beginningBalance));
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const employeeData = {
        ...formData,
        pto: {
          vacation: {
            beginningBalance: Number(vacationBeginningBalanceInput) || 0,
            ongoingBalance: Number(vacationOngoingBalanceInput) || 0,
            firstYearRule: Number(firstYearRuleInput) || 40,
            used: 0
          },
          sickLeave: {
            beginningBalance: Number(sickLeaveBalanceInput) || 0,
            used: 0
          }
        }
      };
      await onSubmit(employeeData);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* PTO Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">PTO Settings</h3>
            
            {/* Vacation Section */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700">Vacation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Beginning Balance (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vacationBeginningBalanceInput}
                    onChange={(e) => setVacationBeginningBalanceInput(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ongoing Balance (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vacationOngoingBalanceInput}
                    onChange={(e) => setVacationOngoingBalanceInput(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Year Rule (hours)
                </label>
                <input
                  type="number"
                  min="0"
                  value={firstYearRuleInput}
                  onChange={(e) => setFirstYearRuleInput(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">Default: 40 hours (5 days)</p>
              </div>
            </div>

            {/* Sick Leave Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Sick Leave</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Beginning Balance (hours)
                </label>
                <input
                  type="number"
                  min="0"
                  value={sickLeaveBalanceInput}
                  onChange={(e) => setSickLeaveBalanceInput(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
