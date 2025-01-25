import React, { useState, useEffect } from 'react';
import { Upload, Plus, LayoutGrid, List } from 'lucide-react';
import ImportLocationsModal from '../components/job-locations/ImportLocationsModal';
import JobLocationForm from '../components/job-locations/JobLocationForm';
import JobLocationCard from '../components/job-locations/JobLocationCard';
import JobLocationList from '../components/job-locations/JobLocationList';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { toast } from '../lib/toast';
import type { JobLocation, JobLocationFormData } from '../lib/types';
import type { JobLocationImport } from '../lib/importJobLocations';

export default function JobLocations() {
  const { 
    getJobLocations, 
    createJobLocation, 
    updateJobLocation, 
    deleteJobLocation,
    subscribeToJobLocations 
  } = useTimeTracking();
  
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<JobLocation | undefined>();
  const [initialFormData, setInitialFormData] = useState<JobLocationFormData | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getJobLocations();
      
      console.log('Loaded locations:', { data, error });
      
      if (error) {
        console.error('Error loading locations:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('No locations data returned');
        setLocations([]);
        return;
      }
      
      console.log('Setting locations:', data);
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job locations. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Initial load of locations');
    loadLocations();
  }, []);

  useEffect(() => {
    console.log('Setting up job locations subscription');
    const subscription = subscribeToJobLocations((payload) => {
      console.log('Job locations subscription update:', payload);
      loadLocations();
    });

    return () => {
      console.log('Cleaning up job locations subscription');
      subscription?.unsubscribe();
    };
  }, [subscribeToJobLocations]);

  const handleImportLocations = async (importedLocations: JobLocationImport[]) => {
    try {
      console.log('Importing locations:', importedLocations);
      
      for (const loc of importedLocations) {
        const { error } = await createJobLocation({
          name: loc.name,
          type: loc.type,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          zip: loc.zip,
          service_type: loc.serviceType,
          is_active: true
        });

        if (error) throw error;
      }

      // Reload locations immediately after successful import
      await loadLocations();

      toast({
        title: 'Success',
        description: 'Locations imported successfully'
      });
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Error importing locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to import locations. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddLocation = async (locationData: JobLocationFormData) => {
    try {
      console.log('Adding location:', locationData);
      const { data, error } = await createJobLocation(locationData);
      console.log('Add location response:', { data, error });
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Location added successfully'
      });
      
      // Manually reload locations since subscription might be delayed
      loadLocations();
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: 'Failed to add location. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await deleteJobLocation(id);
      
      if (error) throw error;
      
      // Update UI immediately
      setLocations(prev => prev.filter(loc => loc.id !== id));
      
      toast({
        title: 'Success',
        description: 'Location deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (location: JobLocation) => {
    // Convert database fields to form fields
    const formData: JobLocationFormData = {
      name: location.name,
      type: location.type,
      service_type: location.service_type,
      is_active: location.is_active,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zip: location.zip || ''
    };
    
    setSelectedLocation(location);
    setInitialFormData(formData);
    setIsFormModalOpen(true);
  };

  const handleUpdate = async (locationData: JobLocationFormData) => {
    if (!selectedLocation) return;
    
    try {
      const { data, error } = await updateJobLocation(selectedLocation.id, locationData);
      
      if (error) throw error;
      
      // Update UI immediately
      if (data) {
        setLocations(prev => 
          prev.map(loc => loc.id === selectedLocation.id ? data[0] : loc)
        );
      }
      
      toast({
        title: 'Success',
        description: 'Location updated successfully'
      });
      
      setIsFormModalOpen(false);
      setSelectedLocation(undefined);
      setInitialFormData(undefined);
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update location. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Job Locations</h1>
        <div className="flex space-x-4">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-600 border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b -ml-px ${
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-600 border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Locations
          </button>
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Location
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map(location => (
            <JobLocationCard
              key={location.id}
              location={location}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <JobLocationList
          locations={locations}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ImportLocationsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportLocations}
      />

      <JobLocationForm
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedLocation(undefined);
          setInitialFormData(undefined);
        }}
        onSubmit={selectedLocation ? handleUpdate : handleAddLocation}
        initialData={initialFormData}
      />
    </div>
  );
}