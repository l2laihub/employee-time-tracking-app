import React from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface LocationFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

interface JobLocation {
  id: string;
  name: string;
}

export default function LocationFilter({ value, onChange }: LocationFilterProps) {
  const [locations, setLocations] = React.useState<JobLocation[]>([]);

  React.useEffect(() => {
    async function fetchLocations() {
      const { data, error } = await supabase
        .from('job_locations')
        .select('id, name')
        .order('name');

      if (!error && data) {
        setLocations(data);
      }
    }

    fetchLocations();
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
      .filter(value => value !== ''); // Remove empty values
    onChange(selectedOptions);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MapPin className="h-5 w-5 text-gray-400" />
      </div>
      <select
        multiple
        value={value}
        onChange={handleSelectChange}
        size={4}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {locations.map(location => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      {value.length === 0 && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-sm text-gray-400">All Locations</span>
        </div>
      )}
    </div>
  );
}