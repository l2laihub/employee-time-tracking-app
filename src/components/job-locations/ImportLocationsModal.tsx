import React, { useState } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { importJobLocations, validateJobLocation, downloadJobLocationsTemplate } from '../../lib/importJobLocations';
import type { JobLocationImport } from '../../lib/importJobLocations';

interface ImportLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (locations: JobLocationImport[]) => void;
}

export default function ImportLocationsModal({ 
  isOpen, 
  onClose, 
  onImport 
}: ImportLocationsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setError(null);
    
    try {
      const locations = await importJobLocations(file);
      
      // Validate all locations
      const errors = locations.flatMap((location, index) => {
        const locationErrors = validateJobLocation(location);
        return locationErrors.map(err => `Row ${index + 2}: ${err}`);
      });
      
      if (errors.length > 0) {
        setError(`Validation errors:\n${errors.join('\n')}`);
        return;
      }
      
      onImport(locations);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import locations');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Import Job Locations</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <button
              onClick={downloadJobLocationsTemplate}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click to select CSV file'}
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-2" />
                <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}