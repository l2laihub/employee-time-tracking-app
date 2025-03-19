import { useState, useEffect, useCallback } from 'react';
import { Upload, Plus, LayoutGrid, List } from 'lucide-react';
import ImportLocationsModal from '../components/job-locations/ImportLocationsModal';
import JobLocationForm from '../components/job-locations/JobLocationForm';
import JobLocationCard from '../components/job-locations/JobLocationCard';
import JobLocationList from '../components/job-locations/JobLocationList';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import type { JobLocation, JobLocationFormData } from '../lib/types';
import type { JobLocationImport } from '../lib/importJobLocations';

export default function JobLocations() {
  const { organization } = useOrganization();
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

  const loadLocations = useCallback(async () => {
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
  }, [getJobLocations]);

  useEffect(() => {
    console.log('Initial load of locations');
    loadLocations();
  }, [loadLocations]);

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
  }, [subscribeToJobLocations, loadLocations]);

  const handleImportLocations = async (importedLocations: JobLocationImport[]) => {
    try {
      console.log('Importing locations:', importedLocations);
      
      if (!organization) {
        throw new Error('Organization not found');
      }
      
      // Get existing locations first
      const { data: existingLocations, error: fetchError } = await getJobLocations();
      if (fetchError) throw fetchError;

      // Fetch service types to map names to IDs
      const { data: serviceTypes, error: serviceTypesError } = await supabase
        .from('service_types')
        .select('id, name')
        .eq('organization_id', organization.id);
      
      if (serviceTypesError) throw serviceTypesError;
      
      if (!serviceTypes || serviceTypes.length === 0) {
        throw new Error('No service types found for your organization. Please create service types first.');
      }
      
      // Create a map of service type names to IDs
      const serviceTypeMap = serviceTypes.reduce((map: Record<string, string>, type: { id: string, name: string }) => {
        // Convert names to lowercase for case-insensitive matching
        map[type.name.toLowerCase()] = type.id;
        return map;
      }, {} as Record<string, string>);
      
      console.log('Service type mapping:', serviceTypeMap);
      console.log('Available service types:', serviceTypes.map((st: { name: string }) => st.name));

      // Track statistics for user feedback
      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const invalidServiceTypes: string[] = [];
      
      for (const loc of importedLocations) {
        // Check for duplicate based on name and address combination
        const isDuplicate = existingLocations?.some((existing: JobLocation) => 
          existing.name.toLowerCase() === loc.name.toLowerCase() && 
          existing.address?.toLowerCase() === loc.address.toLowerCase()
        );

        if (isDuplicate) {
          console.log(`Skipping duplicate location: ${loc.name} at ${loc.address}`);
          skipped++;
          continue;
        }
        
        // Look up the service type ID from the name
        const serviceTypeId = serviceTypeMap[loc.serviceType.toLowerCase()];
        
        if (!serviceTypeId) {
          console.error(`Service type "${loc.serviceType}" not found in your organization`);
          errors++;
          if (!invalidServiceTypes.includes(loc.serviceType)) {
            invalidServiceTypes.push(loc.serviceType);
          }
          continue;
        }

        // Ensure the type is either 'commercial' or 'residential'
        const locationType = loc.type.toLowerCase() === 'commercial' ? 'commercial' : 'residential';

        try {
          // Use the createJobLocation function from the useTimeTracking hook
          // This function is already set up to work with the organization's RLS policies
          const { error } = await createJobLocation({
            name: loc.name,
            type: locationType as 'commercial' | 'residential',
            address: loc.address,
            city: loc.city,
            state: loc.state,
            zip: loc.zip,
            service_type: serviceTypeId,
            is_active: true,
            organization_id: organization.id
          });

          if (error) {
            console.error('Error creating location:', error);
            errors++;
            continue;
          }
          
          imported++;
        } catch (insertError) {
          console.error('Exception creating location:', insertError);
          errors++;
          continue;
        }
      }

      // Reload locations immediately after successful import
      await loadLocations();

      let message = `Successfully imported ${imported} location${imported !== 1 ? 's' : ''}.`;
      if (skipped > 0) {
        message += ` Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}.`;
      }
      if (errors > 0) {
        message += ` Failed to import ${errors} location${errors !== 1 ? 's' : ''}.`;
        
        if (invalidServiceTypes.length > 0) {
          message += ` Invalid service types: ${invalidServiceTypes.join(', ')}. Available types are: ${serviceTypes.map((st: { name: string }) => st.name).join(', ')}.`;
        }
      }

      toast({
        title: 'Import Complete',
        description: message
      });
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Error importing locations:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import locations. Please try again.',
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
      const normalizeLocation = (location: JobLocation | JobLocationFormData) => ({
        name: normalizeString(location.name),
        address: normalizeString(location.address as string),
        city: normalizeString(location.city as string),
        state: normalizeString(location.state as string),
        zip: normalizeString(location.zip as string)
      });

      // Normalize new location
      const newLocation = normalizeLocation(locationData);
      console.log('Normalized new location:', newLocation);

      // Check for duplicates
      const isDuplicate = existingLocations?.some((existing: JobLocation) => {
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
      const { data, error } = await createJobLocation({
        organization_id: organization.id,
        ...locationData
      });
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
      const { data, error } = await updateJobLocation(selectedLocation.id, {
        organization_id: organization.id,
        ...locationData
      });
      
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
              aria-label="Grid view"
              title="Grid view"
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
              aria-label="List view"
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
            aria-label="Import job locations"
            title="Import job locations"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
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