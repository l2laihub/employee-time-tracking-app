import { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { Button } from '../design-system';

interface ServiceType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function ServiceTypeManagement() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newServiceTypeName, setNewServiceTypeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
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
    if (!editingName.trim()) {
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

      setServiceTypes(
        serviceTypes.map(st => 
          st.id === editingId 
            ? { ...st, name: editingName.trim() } 
            : st
        )
      );
      
      setEditingId(null);
      setEditingName('');
      
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
    // Check if service type is in use before deleting
    try {
      const { count, error: countError } = await supabase
        .from('job_locations')
        .select('id', { count: 'exact', head: true })
        .eq('service_type', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast({
          title: 'Cannot Delete',
          description: 'This service type is being used by job locations and cannot be deleted',
          variant: 'destructive'
        });
        return;
      }

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Manage Service Types</h2>
      
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newServiceTypeName}
            onChange={(e) => setNewServiceTypeName(e.target.value)}
            placeholder="Enter new service type"
            aria-label="New service type name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <Button onClick={handleAddServiceType} className="flex items-center gap-1">
            <PlusCircle className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Type
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {serviceTypes.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                  No service types found. Add one to get started.
                </td>
              </tr>
            ) : (
              serviceTypes.map((serviceType) => (
                <tr key={serviceType.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === serviceType.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        aria-label="Edit service type name"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      serviceType.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === serviceType.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleUpdateServiceType}
                          className="text-green-600 hover:text-green-900"
                          aria-label="Save changes"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-900"
                          aria-label="Cancel editing"
                          title="Cancel editing"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEditing(serviceType)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`Edit ${serviceType.name}`}
                          title={`Edit ${serviceType.name}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteServiceType(serviceType.id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label={`Delete ${serviceType.name}`}
                          title={`Delete ${serviceType.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
