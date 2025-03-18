import { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { Button } from '../design-system';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Navigate } from 'react-router-dom';

interface ServiceType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export default function ServiceTypeManagement() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newServiceTypeName, setNewServiceTypeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { userRole, organization } = useOrganization();
  
  // Check if user has permission to manage service types (admin or super_admin)
  const hasPermission = userRole === 'super_admin' || userRole === 'admin';

  useEffect(() => {
    if (hasPermission && organization?.id) {
      fetchServiceTypes();
    }
  }, [hasPermission, organization?.id]);

  const fetchServiceTypes = async () => {
    if (!organization?.id) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
      
      if (error) throw error;
      
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service types',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServiceType = async () => {
    if (!organization?.id) return;
    
    if (!newServiceTypeName.trim()) {
      toast({
        title: 'Error',
        description: 'Service type name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_types')
        .insert([
          { 
            name: newServiceTypeName.trim(),
            organization_id: organization.id,
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      setServiceTypes([...(data || []), ...serviceTypes]);
      setNewServiceTypeName('');
      
      toast({
        title: 'Success',
        description: 'Service type added successfully'
      });
    } catch (error) {
      console.error('Error adding service type:', error);
      toast({
        title: 'Error',
        description: 'Failed to add service type',
        variant: 'destructive'
      });
    }
  };

  const startEditing = (serviceType: ServiceType) => {
    setEditingId(serviceType.id);
    setEditingName(serviceType.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdateServiceType = async () => {
    if (!editingName.trim() || !editingId) {
      toast({
        title: 'Error',
        description: 'Service type name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('service_types')
        .update({ 
          name: editingName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      setServiceTypes(serviceTypes.map(st => 
        st.id === editingId ? { ...st, name: editingName.trim() } : st
      ));
      
      cancelEditing();
      
      toast({
        title: 'Success',
        description: 'Service type updated successfully'
      });
    } catch (error) {
      console.error('Error updating service type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service type',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteServiceType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service type? This may affect existing time entries.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setServiceTypes(serviceTypes.filter(st => st.id !== id));
      
      toast({
        title: 'Success',
        description: 'Service type deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service type',
        variant: 'destructive'
      });
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

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Service Types</h2>
      <p className="text-gray-500 mb-6">
        Manage the service types that employees can select when logging time.
      </p>
      
      {/* Add new service type */}
      <div className="flex items-center space-x-2 mb-6">
        <input
          type="text"
          value={newServiceTypeName}
          onChange={(e) => setNewServiceTypeName(e.target.value)}
          placeholder="New service type name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-label="New service type name"
        />
        <Button 
          onClick={handleAddServiceType}
          disabled={isLoading || !newServiceTypeName.trim()}
          className="inline-flex items-center"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      
      {/* List of service types */}
      {isLoading ? (
        <div className="text-center py-4">Loading service types...</div>
      ) : serviceTypes.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No service types found. Add one to get started.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {serviceTypes.map((serviceType) => (
            <li key={serviceType.id} className="py-3">
              {editingId === serviceType.id ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Edit service type name"
                  />
                  <button
                    onClick={handleUpdateServiceType}
                    className="p-1 text-green-600 hover:text-green-800"
                    aria-label="Save changes"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-1 text-gray-600 hover:text-gray-800"
                    aria-label="Cancel editing"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">{serviceType.name}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => startEditing(serviceType)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      aria-label={`Edit ${serviceType.name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteServiceType(serviceType.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      aria-label={`Delete ${serviceType.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
