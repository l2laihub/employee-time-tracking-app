import React from 'react';
import type { JobLocation } from '../../lib/types';
import { Building2, Home, MapPin } from 'lucide-react';

interface JobSelectorProps {
  jobs: JobLocation[];
  selectedJobId: string | null;
  onSelect: (jobId: string) => void;
  disabled?: boolean;
}

export default function JobSelector({ jobs, selectedJobId, onSelect, disabled }: JobSelectorProps) {
  const activeJobs = jobs.filter(job => job.is_active);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Select Job Location</h3>
      <div className="relative">
        <select
          value={selectedJobId || ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className={`block w-full pl-10 pr-4 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          <option value="">Select a location to clock in...</option>
          {activeJobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.name} - {job.city}, {job.state}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {selectedJobId && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          {(() => {
            const selectedJob = jobs.find(job => job.id === selectedJobId);
            if (!selectedJob) return null;

            return (
              <div className="space-y-2">
                <div className="flex items-center">
                  {selectedJob.type === 'commercial' ? (
                    <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                  ) : (
                    <Home className="w-5 h-5 text-green-600 mr-2" />
                  )}
                  <h4 className="font-medium text-gray-900">{selectedJob.name}</h4>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  {selectedJob.address}
                  {selectedJob.city && selectedJob.state && (
                    <span>
                      <br />
                      {selectedJob.city}, {selectedJob.state} {selectedJob.zip}
                    </span>
                  )}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}