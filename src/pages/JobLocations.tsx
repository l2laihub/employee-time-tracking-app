import React, { useState } from 'react';
import { mockJobLocations } from '../lib/mockData';
import { Upload, Plus, LayoutGrid, List } from 'lucide-react';
import ImportLocationsModal from '../components/job-locations/ImportLocationsModal';
import JobLocationForm from '../components/job-locations/JobLocationForm';
import JobLocationCard from '../components/job-locations/JobLocationCard';
import JobLocationList from '../components/job-locations/JobLocationList';
import type { JobLocation } from '../lib/types';
import type { JobLocationImport } from '../lib/importJobLocations';

export default function JobLocations() {
  const [locations, setLocations] = useState(mockJobLocations);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<JobLocation | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleImportLocations = (importedLocations: JobLocationImport[]) => {
    const newLocations = importedLocations.map((loc, index) => ({
      id: `imported-${index}`,
      name: loc.name,
      type: loc.type,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      serviceType: loc.serviceType,
      isActive: true
    }));

    setLocations([...locations, ...newLocations]);
  };

  const handleAddLocation = (locationData: Omit<JobLocation, 'id'>) => {
    const newLocation = {
      ...locationData,
      id: `loc-${Date.now()}`
    };
    setLocations([...locations, newLocation]);
    setIsFormModalOpen(false);
  };

  const handleEditLocation = (locationData: Omit<JobLocation, 'id'>) => {
    if (!selectedLocation) return;
    
    setLocations(locations.map(loc => 
      loc.id === selectedLocation.id 
        ? { ...locationData, id: loc.id }
        : loc
    ));
    setSelectedLocation(undefined);
    setIsFormModalOpen(false);
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      setLocations(locations.filter(loc => loc.id !== id));
    }
  };

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
              onEdit={(loc) => {
                setSelectedLocation(loc);
                setIsFormModalOpen(true);
              }}
              onDelete={handleDeleteLocation}
            />
          ))}
        </div>
      ) : (
        <JobLocationList
          locations={locations}
          onEdit={(loc) => {
            setSelectedLocation(loc);
            setIsFormModalOpen(true);
          }}
          onDelete={handleDeleteLocation}
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
        }}
        onSubmit={selectedLocation ? handleEditLocation : handleAddLocation}
        initialData={selectedLocation}
      />
    </div>
  );
}