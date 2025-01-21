import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DEPARTMENTS } from '../../lib/constants/departments';
import type { Employee } from '../../lib/types';
import { formatDateForInput, getTodayForInput } from '../../utils/dateUtils';

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, 'id'>) => void;
  initialData?: Employee | null;
}

export default function EmployeeForm({ 
  isOpen, 
  onClose, 
  onSubmit,
  initialData 
}: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'employee' as Employee['role'],
    department: '',
    status: 'active' as 'active' | 'inactive',
    startDate: getTodayForInput(),
    pto: {
      vacation: {
        beginningBalance: 0,
        ongoingBalance: 0,
        firstYearRule: 40, // Default 5 days (40 hours)
      },
      sickLeave: {
        beginningBalance: 0,
      },
    },
  });

  const [firstYearRuleInput, setFirstYearRuleInput] = useState<string>('40');
  const [beginningBalanceInput, setBeginningBalanceInput] = useState<string>('0');
  const [ongoingBalanceInput, setOngoingBalanceInput] = useState<string>('0');
  const [sickLeaveBalanceInput, setSickLeaveBalanceInput] = useState<string>('0');

  // Reset form data when initialData changes or form opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        role: initialData?.role || 'employee',
        department: initialData?.department || '',
        status: initialData?.status || 'active',
        startDate: initialData?.startDate ? formatDateForInput(initialData.startDate) : getTodayForInput(),
        pto: {
          vacation: {
            beginningBalance: initialData?.pto?.vacation?.beginningBalance || 0,
            ongoingBalance: initialData?.pto?.vacation?.ongoingBalance || 0,
            firstYearRule: initialData?.pto?.vacation?.firstYearRule || 40,
          },
          sickLeave: {
            beginningBalance: initialData?.pto?.sickLeave?.beginningBalance || 0,
          },
        },
      });
      setFirstYearRuleInput(String(initialData?.pto?.vacation?.firstYearRule || 40));
      setBeginningBalanceInput(String(initialData?.pto?.vacation?.beginningBalance || 0));
      setOngoingBalanceInput(String(initialData?.pto?.vacation?.ongoingBalance || 0));
      setSickLeaveBalanceInput(String(initialData?.pto?.sickLeave?.beginningBalance || 0));
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure PTO structure is complete before submitting
    const employeeData = {
      ...formData,
      pto: {
        vacation: {
          beginningBalance: Number(formData.pto.vacation.beginningBalance) || 0,
          ongoingBalance: Number(formData.pto.vacation.ongoingBalance) || 0,
          firstYearRule: Number(formData.pto.vacation.firstYearRule) || 40,
        },
        sickLeave: {
          beginningBalance: Number(formData.pto.sickLeave.beginningBalance) || 0,
        },
      },
    };
    onSubmit(employeeData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            {initialData ? 'Edit' : 'Add New'} Employee
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as Employee['role'] }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <select
                value={formData.department}
                onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                required
                max={getTodayForInput()}
                value={formData.startDate}
                onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* PTO Section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">PTO Settings</h4>
            
            {/* Vacation Section */}
            <div className="space-y-4 mb-6">
              <h5 className="text-sm font-medium text-gray-700">Vacation</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Beginning Balance (hours)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="numeric"
                    value={beginningBalanceInput}
                    onChange={e => {
                      const newValue = e.target.value;
                      setBeginningBalanceInput(newValue);
                      setFormData(prev => ({
                        ...prev,
                        pto: {
                          ...prev.pto,
                          vacation: {
                            ...prev.pto.vacation,
                            beginningBalance: newValue === '' ? 0 : Number(newValue)
                          }
                        }
                      }));
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 py-2 touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ongoing Balance (hours)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="numeric"
                    value={ongoingBalanceInput}
                    onChange={e => {
                      const newValue = e.target.value;
                      setOngoingBalanceInput(newValue);
                      setFormData(prev => ({
                        ...prev,
                        pto: {
                          ...prev.pto,
                          vacation: {
                            ...prev.pto.vacation,
                            ongoingBalance: newValue === '' ? 0 : Number(newValue)
                          }
                        }
                      }));
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 py-2 touch-manipulation"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">First Year Rule (hours)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="numeric"
                  value={firstYearRuleInput}
                  onChange={e => {
                    const newValue = e.target.value;
                    setFirstYearRuleInput(newValue);
                    setFormData(prev => ({
                      ...prev,
                      pto: {
                        ...prev.pto,
                        vacation: {
                          ...prev.pto.vacation,
                          firstYearRule: newValue === '' ? 40 : Number(newValue)
                        }
                      }
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 py-2 touch-manipulation"
                />
                <p className="mt-1 text-sm text-gray-500">Default: 40 hours (5 days)</p>
              </div>
            </div>

            {/* Sick Leave Section */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-gray-700">Sick Leave</h5>
              <div>
                <label className="block text-sm font-medium text-gray-700">Beginning Balance (hours)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="numeric"
                  value={sickLeaveBalanceInput}
                  onChange={e => {
                    const newValue = e.target.value;
                    setSickLeaveBalanceInput(newValue);
                    setFormData(prev => ({
                      ...prev,
                      pto: {
                        ...prev.pto,
                        sickLeave: {
                          ...prev.pto.sickLeave,
                          beginningBalance: newValue === '' ? 0 : Number(newValue)
                        }
                      }
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 py-2 touch-manipulation"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {initialData ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
