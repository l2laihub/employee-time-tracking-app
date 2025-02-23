import React from 'react';
import { Building2, Home, MapPin } from 'lucide-react';
import { Select, Card } from '../design-system';
import type { JobLocation } from '../../types/custom.types';

interface JobSelectorProps {
  /**
   * List of available job locations
   */
  jobs: JobLocation[];
  
  /**
   * Currently selected job ID
   */
  selectedJobId: string | null;
  
  /**
   * Callback when a job is selected
   */
  onSelect: (jobId: string) => void;
  
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}

/**
 * Job location selector component
 */
export default function JobSelector({ jobs, selectedJobId, onSelect, disabled }: JobSelectorProps) {
  const activeJobs = jobs.filter(job => job.is_active);

  return (
    <div className="space-y-4">
      <Select
        label="Select Job Location"
        value={selectedJobId || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        leftIcon={<MapPin className="h-5 w-5" />}
      >
        <option value="">Select a location to clock in...</option>
        {activeJobs.map(job => (
          <option key={job.id} value={job.id}>
            {job.name}
          </option>
        ))}
      </Select>

      {selectedJobId && (() => {
        const selectedJob = jobs.find(job => job.id === selectedJobId);
        if (!selectedJob) return null;

        return (
          <Card className="bg-neutral-50 border-neutral-100">
            <div className="space-y-2">
              <div className="flex items-center">
                {selectedJob.type === 'commercial' ? (
                  <Building2 className="w-5 h-5 text-primary-600 mr-2" />
                ) : (
                  <Home className="w-5 h-5 text-success-600 mr-2" />
                )}
                <h4 className="font-medium text-neutral-900">
                  {selectedJob.name}
                </h4>
              </div>
              <p className="text-sm text-neutral-600 ml-7">
                {selectedJob.address}
              </p>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}