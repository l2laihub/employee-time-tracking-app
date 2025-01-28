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
      
      // Get existing locations first
      const { data: existingLocations, error: fetchError } = await getJobLocations();
      if (fetchError) throw fetchError;

      // Track statistics for user feedback
      let imported = 0;
      let skipped = 0;
      
      for (const loc of importedLocations) {
        // Check for duplicate based on name and address combination
        const isDuplicate = existingLocations?.some(existing => 
          existing.name.toLowerCase() === loc.name.toLowerCase() && 
          existing.address?.toLowerCase() === loc.address.toLowerCase()
        );

        if (isDuplicate) {
          console.log(`Skipping duplicate location: ${loc.name} at ${loc.address}`);
          skipped++;
          continue;
        }

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
        imported++;
      }

      // Reload locations immediately after successful import
      await loadLocations();

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${imported} location${imported !== 1 ? 's' : ''}. ${skipped ? `Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}.` : ''}`
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
      console.log('Adding location with data:', JSON.stringify(locationData, null, 2));

      // Check for existing locations with same name and address
      const { data: existingLocations, error: fetchError } = await getJobLocations();
      if (fetchError) throw fetchError;

      console.log('Found existing locations:', existingLocations?.length);

      // Helper function to normalize strings for comparison
      const normalizeString = (value: string | null | undefined): string => {
        if (!value) return '';
        // Convert to lowercase, trim spaces, and remove extra whitespace
        return value.toLowerCase()
          .trim()
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/[.,#-]/g, '') // Remove common address punctuation
          .replace(/street|st|avenue|ave|boulevard|blvd|road|rd|lane|ln|drive|dr/gi, ''); // Remove common street type variations
      };

      // Helper function to normalize address fields
      const normalizeLocation = (location: any) => ({
        name: normalizeString(location.name),
        address: normalizeString(location.address),
        city: normalizeString(location.city),
        state: normalizeString(location.state),
        zip: normalizeString(location.zip)
      });

      // Normalize new location
      const newLocation = normalizeLocation(locationData);
      console.log('Normalized new location:', newLocation);

      // Check for duplicates
      const isDuplicate = existingLocations?.some(existing => {
        const existingLocation = normalizeLocation(existing);
        console.log('Comparing with existing location:', {
          id: existing.id,
          normalized: existingLocation,
          original: {
            name: existing.name,
            address: existing.address,
            city: existing.city,
            state: existing.state,
            zip: existing.zip
          }
        });

        // Compare name first
        if (existingLocation.name !== newLocation.name) {
          return false;
        }

        // If names match, check address fields
        const addressFieldsMatch = 
          existingLocation.address === newLocation.address &&
          existingLocation.city === newLocation.city &&
          existingLocation.state === newLocation.state &&
          existingLocation.zip === newLocation.zip;

        if (addressFieldsMatch) {
          console.log('Found duplicate location:', {
            existing: existingLocation,
            new: newLocation
          });
        }

        return addressFieldsMatch;
      });

      if (isDuplicate) {
        console.log('Duplicate location detected - preventing creation');
        toast({
          title: 'Duplicate Location',
          description: 'A location with this name and address already exists.',
          variant: 'destructive'
        });
        return;
      }

      console.log('No duplicate found - creating new location');
      const { data, error } = await createJobLocation(locationData);
      console.log('Create location response:', { data, error });

      if (error) {
        // Check if it's a unique constraint violation
        if (error.message?.includes('job_locations_name_address_unique')) {
          toast({
            title: 'Duplicate Location',
            description: 'A location with this name and address already exists.',
            variant: 'destructive'
          });
          return;
        }
        throw error;
      }

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