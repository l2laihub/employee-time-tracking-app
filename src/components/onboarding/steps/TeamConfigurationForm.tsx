import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface TeamConfigurationFormProps {
  onSubmit: () => void;
}

const TeamConfigurationForm: React.FC<TeamConfigurationFormProps> = ({ onSubmit }) => {
  const { completeStep } = useOnboarding();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [expectedUsers, setExpectedUsers] = useState<string>('');

  const handleAddDepartment = () => {
    if (newDepartment.name.trim()) {
      setDepartments([
        ...departments,
        {
          id: crypto.randomUUID(),
          name: newDepartment.name,
          description: newDepartment.description
        }
      ]);
      setNewDepartment({ name: '', description: '' });
    }
  };

  const handleAddRole = () => {
    if (newRole.name.trim()) {
      setRoles([
        ...roles,
        {
          id: crypto.randomUUID(),
          name: newRole.name,
          description: newRole.description
        }
      ]);
      setNewRole({ name: '', description: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeStep('team');
    onSubmit();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Configure Your Team Structure
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Expected Users */}
        <div>
          <label
            htmlFor="expectedUsers"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Expected Number of Users
          </label>
          <input
            type="number"
            id="expectedUsers"
            value={expectedUsers}
            onChange={(e) => setExpectedUsers(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            min="1"
            required
          />
        </div>

        {/* Departments Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Departments</h3>
          
          {/* Department List */}
          <div className="mb-4 space-y-2">
            {departments.map(dept => (
              <div
                key={dept.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <p className="font-medium">{dept.name}</p>
                  {dept.description && (
                    <p className="text-sm text-gray-500">{dept.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDepartments(departments.filter(d => d.id !== dept.id))}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add Department Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newDepartment.name}
              onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
              placeholder="Department Name"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <input
              type="text"
              value={newDepartment.description}
              onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
              placeholder="Description (optional)"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={handleAddDepartment}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Roles Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Roles</h3>
          
          {/* Roles List */}
          <div className="mb-4 space-y-2">
            {roles.map(role => (
              <div
                key={role.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <p className="font-medium">{role.name}</p>
                  {role.description && (
                    <p className="text-sm text-gray-500">{role.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRoles(roles.filter(r => r.id !== role.id))}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add Role Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              placeholder="Role Name"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <input
              type="text"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              placeholder="Description (optional)"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={handleAddRole}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamConfigurationForm;