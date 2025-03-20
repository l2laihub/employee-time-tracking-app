import React, { useState, useEffect, useCallback } from 'react';
import { useOnboarding } from '../../../hooks/useOnboarding';

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface ServiceType {
  id: string;
  name: string;
  description?: string;
}

interface TeamConfigurationFormProps {
  onSubmit: () => void;
}

const TeamConfigurationForm: React.FC<TeamConfigurationFormProps> = ({ onSubmit }) => {
  const { state, updateTeam, completeStep } = useOnboarding();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [newServiceType, setNewServiceType] = useState({ name: '', description: '' });
  const [expectedUsers, setExpectedUsers] = useState<string>(state.team.expectedUsers?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing departments and service types on load
  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        setIsLoading(true);
        
        // During onboarding, we don't need to fetch existing departments/service types
        // since the organization doesn't exist yet
        // Just use empty arrays and let the user define their departments/service types
        const savedDepartments = state.team.departments || [];
        const departmentsWithCorrectFormat = savedDepartments.map((dept: string | Department) => {
          if (typeof dept === 'string') {
            return { id: crypto.randomUUID(), name: dept, description: '' };
          }
          return dept;
        });
        
        const savedServiceTypes = state.team.serviceTypes || [];
        const serviceTypesWithCorrectFormat = savedServiceTypes.map((type: string | ServiceType) => {
          if (typeof type === 'string') {
            return { id: crypto.randomUUID(), name: type, description: '' };
          }
          return type;
        });
        
        setDepartments(departmentsWithCorrectFormat);
        setServiceTypes(serviceTypesWithCorrectFormat);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching organization data:', err);
        setError('Failed to load organization data');
        setIsLoading(false);
      }
    };
    
    fetchOrganizationData();
  }, [state.team.departments, state.team.serviceTypes]);

  const handleAddDepartment = () => {
    if (newDepartment.name.trim()) {
      const newDept = {
        id: crypto.randomUUID(),
        name: newDepartment.name,
        description: newDepartment.description
      };
      setDepartments([...departments, newDept]);
      setNewDepartment({ name: '', description: '' });
    }
  };

  const handleAddServiceType = () => {
    if (newServiceType.name.trim()) {
      const newType = {
        id: crypto.randomUUID(),
        name: newServiceType.name,
        description: newServiceType.description
      };
      setServiceTypes([...serviceTypes, newType]);
      setNewServiceType({ name: '', description: '' });
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Save team configuration to context
      await updateTeam({
        expectedUsers: parseInt(expectedUsers) || 0,
        departments: departments,
        serviceTypes: serviceTypes,
        roles: []
      });
      
      // During onboarding, we don't need to save to the database
      // The departments and service types will be saved when the organization is created
      
      completeStep('team');
      onSubmit();
    } catch (err) {
      console.error('Error saving team configuration:', err);
      setError('Failed to save team configuration');
    } finally {
      setIsLoading(false);
    }
  }, [departments, serviceTypes, expectedUsers, updateTeam, completeStep, onSubmit]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button 
          className="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded hover:bg-red-200"
          onClick={() => setError(null)}
        >
          Try Again
        </button>
      </div>
    );
  }

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
          <p className="text-sm text-gray-500 mb-4">
            Your organization already has default departments. You can add more custom departments below.
          </p>
          
          {/* Department List */}
          <div className="mb-4 space-y-2">
            {departments.map((dept: Department) => (
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
                  disabled={!dept.id.includes('-')} // Only allow removing custom departments
                >
                  {dept.id.includes('-') ? 'Remove' : 'Default'}
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
              disabled={!newDepartment.name.trim()}
            >
              Add
            </button>
          </div>
        </div>

        {/* Service Types Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Types</h3>
          <p className="text-sm text-gray-500 mb-4">
            Your organization already has default service types. You can add more custom service types below.
          </p>
          
          {/* Service Types List */}
          <div className="mb-4 space-y-2">
            {serviceTypes.map((type: ServiceType) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <p className="font-medium">{type.name}</p>
                  {type.description && (
                    <p className="text-sm text-gray-500">{type.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setServiceTypes(serviceTypes.filter(t => t.id !== type.id))}
                  className="text-red-600 hover:text-red-800"
                  disabled={!type.id.includes('-')} // Only allow removing custom service types
                >
                  {type.id.includes('-') ? 'Remove' : 'Default'}
                </button>
              </div>
            ))}
          </div>

          {/* Add Service Type Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newServiceType.name}
              onChange={(e) => setNewServiceType({ ...newServiceType, name: e.target.value })}
              placeholder="Service Type Name"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <input
              type="text"
              value={newServiceType.description}
              onChange={(e) => setNewServiceType({ ...newServiceType, description: e.target.value })}
              placeholder="Description (optional)"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={handleAddServiceType}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              disabled={!newServiceType.name.trim()}
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
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Complete Setup'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamConfigurationForm;