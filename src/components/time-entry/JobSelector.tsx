import React from 'react';
import { JobLocation } from '../../lib/mockData';
import { Building2, Home } from 'lucide-react';

interface JobSelectorProps {
  jobs: JobLocation[];
  selectedJobId: string | null;
  onSelect: (jobId: string) => void;
}

export default function JobSelector({ jobs, selectedJobId, onSelect }: JobSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Select Job Location</h3>
      <div className="grid grid-cols-1 gap-3">
        {jobs.map(job => (
          <button
            key={job.id}
            onClick={() => onSelect(job.id)}
            className={`flex items-start p-4 rounded-lg border ${
              selectedJobId === job.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex-shrink-0 mt-1">
              {job.type === 'commercial' ? (
                <Building2 className="w-5 h-5 text-blue-600" />
              ) : (
                <Home className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="ml-4 text-left">
              <h4 className="text-sm font-medium text-gray-900">{job.name}</h4>
              <p className="mt-1 text-xs text-gray-500">
                {job.address}, {job.city}
              </p>
              <span className="mt-1 inline-block px-2 py-0.5 text-xs rounded-full capitalize
                ${job.serviceType === 'both' ? 'bg-purple-100 text-purple-800' :
                  job.serviceType === 'hvac' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'}">
                {job.serviceType === 'both' ? 'HVAC & Plumbing' : job.serviceType.toUpperCase()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}