import { useState, useEffect } from 'react';
import { Building2, Home, MapPin } from 'lucide-react';
import type { JobLocation } from '../../lib/types';
import { supabase } from '../../lib/supabase';

interface ServiceType {
  id: string;
  name: string;
}

interface JobLocationListProps {
  locations: JobLocation[];
  onEdit: (location: JobLocation) => void;
  onDelete: (id: string) => void;
}

export default function JobLocationList({ locations, onEdit, onDelete }: JobLocationListProps) {
  const [serviceTypes, setServiceTypes] = useState<Record<string, string>>({});

  // Fetch all service types once when the component mounts
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('service_types')
          .select('id, name');
        
        if (error) {
          console.error('Error fetching service types:', error);
        } else if (data) {
          // Create a mapping of id -> name for quick lookups
          const typeMap: Record<string, string> = {};
          data.forEach((type: ServiceType) => {
            typeMap[type.id] = type.name;
          });
          setServiceTypes(typeMap);
        }
      } catch (error) {
        console.error('Error fetching service types:', error);
      }
    };

    fetchServiceTypes();
  }, []);

  // Function to get the service type name from the UUID
  const getServiceTypeName = (serviceTypeId: string): string => {
    if (!serviceTypeId) return 'Unknown';
    return serviceTypes[serviceTypeId] || 'Loading...';
  };

  // Function to get the appropriate CSS class for the service type badge
  const getServiceTypeClass = (serviceTypeId: string): string => {
    const typeName = getServiceTypeName(serviceTypeId);
    if (typeName === 'Both') {
      return 'bg-purple-100 text-purple-800';
    } else if (typeName === 'HVAC') {
      return 'bg-blue-100 text-blue-800';
    } else if (typeName === 'Plumbing') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Address
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Service
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {locations.map((location) => (
            <tr key={location.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {location.type === 'commercial' ? (
                    <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                  ) : (
                    <Home className="w-5 h-5 text-green-600 mr-2" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{location.name}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-start text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mt-0.5 mr-1 flex-shrink-0" />
                  <div>
                    <p>{location.address}</p>
                    <p>{location.city}, {location.state} {location.zip}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  location.type === 'commercial' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {location.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  getServiceTypeClass(location.service_type)
                }`}>
                  {getServiceTypeName(location.service_type) === 'Both' 
                    ? 'HVAC & Plumbing' 
                    : getServiceTypeName(location.service_type)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  location.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {location.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(location)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(location.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}