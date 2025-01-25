import React from 'react';
import { MapPin, Building2, Home, Wrench, Edit2, Trash2 } from 'lucide-react';
import type { JobLocation } from '../../lib/types';

interface JobLocationCardProps {
  location: JobLocation;
  onEdit: (location: JobLocation) => void;
  onDelete: (id: string) => void;
}

export default function JobLocationCard({ location, onEdit, onDelete }: JobLocationCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          {location.type === 'commercial' ? (
            <Building2 className="w-5 h-5 text-blue-600 mr-2" />
          ) : (
            <Home className="w-5 h-5 text-green-600 mr-2" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs ${
            location.type === 'commercial' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {location.type}
          </span>
          {!location.is_active && (
            <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-800">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start">
          <MapPin className="w-4 h-4 text-gray-400 mt-1 mr-2" />
          <div>
            <p className="text-gray-600">{location.address}</p>
            <p className="text-gray-600">{location.city}, {location.state} {location.zip}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Wrench className="w-4 h-4 text-gray-400 mr-2" />
          <p className="text-gray-600 capitalize">
            {location.service_type === 'both' 
              ? 'HVAC & Plumbing' 
              : location.service_type.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(location)}
          className="flex-1 px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </button>
        <button
          onClick={() => onDelete(location.id)}
          className="flex-1 px-3 py-2 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>
    </div>
  );
}