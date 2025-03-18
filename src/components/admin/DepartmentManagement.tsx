import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save, X } from 'lucide-react';
import { manageDepartments, getDepartments } from '../../services/departments';
import { toast } from 'react-hot-toast';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Navigate } from 'react-router-dom';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { userRole, organization } = useOrganization();
  
  // Check if user has permission to manage departments (admin or super_admin)
  const hasPermission = userRole === 'super_admin' || userRole === 'admin';

  useEffect(() => {
    if (hasPermission && organization?.id) {
      loadDepartments();
    }
  }, [hasPermission, organization?.id]);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const fetchedDepartments = await getDepartments();
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect users without permission
  if (!hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  // Ensure organization exists
  if (!organization?.id) {
    return <div className="p-4">Loading organization data...</div>;
  }

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) return;
    
    setIsLoading(true);
    try {
      await manageDepartments('add', newDepartment, '', organization.id);
      setDepartments([...departments, newDepartment]);
      setNewDepartment('');
      toast.success('Department added successfully');
    } catch (error) {
      console.error('Failed to add department:', error);
      toast.error('Failed to add department');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDepartment = (index: number) => {
    setEditingIndex(index);
    setEditValue(departments[index]);
  };

  const handleSaveEdit = async (index: number) => {
    if (!editValue.trim()) return;
    if (editValue === departments[index]) {
      setEditingIndex(null);
      return;
    }

    setIsLoading(true);
    try {
      await manageDepartments('update', editValue, departments[index]);
      const updatedDepartments = [...departments];
      updatedDepartments[index] = editValue;
      setDepartments(updatedDepartments);
      setEditingIndex(null);
      toast.success('Department updated successfully');
    } catch (error) {
      console.error('Failed to update department:', error);
      toast.error('Failed to update department');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDepartment = async (index: number) => {
    const departmentToDelete = departments[index];
    
    if (confirm(`Are you sure you want to delete the department "${departmentToDelete}"? This may affect employees currently assigned to this department.`)) {
      setIsLoading(true);
      try {
        await manageDepartments('delete', departmentToDelete);
        const updatedDepartments = departments.filter((_, i) => i !== index);
        setDepartments(updatedDepartments);
        toast.success('Department deleted successfully');
      } catch (error) {
        console.error('Failed to delete department:', error);
        toast.error('Failed to delete department');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Department Management</h2>
      <p className="text-gray-500 mb-4">
        Add, edit, or remove departments in your organization. Changes will affect where employees can be assigned.
      </p>

      {/* Add new department */}
      <div className="flex mb-6">
        <label htmlFor="new-department" className="sr-only">New department name</label>
        <input
          id="new-department"
          type="text"
          value={newDepartment}
          onChange={(e) => setNewDepartment(e.target.value)}
          placeholder="New department name"
          className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={handleAddDepartment}
          disabled={!newDepartment.trim() || isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          aria-label="Add department"
          title="Add department"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Departments list */}
      <div className="border rounded-md divide-y">
        {departments.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {isLoading ? 'Loading departments...' : 'No departments found. Add one above.'}
          </div>
        ) : (
          departments.map((department, index) => (
            <div key={index} className="flex items-center justify-between p-3">
              {editingIndex === index ? (
                <div className="flex-1 flex">
                  <label htmlFor={`edit-department-${index}`} className="sr-only">Edit department name</label>
                  <input
                    id={`edit-department-${index}`}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(index)}
                    disabled={!editValue.trim() || isLoading}
                    className="bg-green-600 text-white p-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                    aria-label="Save department"
                    title="Save department"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="bg-gray-200 text-gray-600 p-2 rounded-r-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    disabled={isLoading}
                    aria-label="Cancel editing"
                    title="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-gray-700">{department}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditDepartment(index)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      disabled={isLoading}
                      aria-label={`Edit ${department} department`}
                      title={`Edit ${department} department`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                      disabled={isLoading}
                      aria-label={`Delete ${department} department`}
                      title={`Delete ${department} department`}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
