import React, { useState } from 'react';
import { Download, Upload, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
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

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 w-full max-w-lg"
          aria-describedby="import-description"
        >
          <Dialog.Description className="sr-only">
            Form to import job locations from a CSV file. You can download a template and upload your filled CSV file.
          </Dialog.Description>

          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-semibold">
              Import Job Locations
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Upload a CSV file containing job locations. Download the template below for the correct format.
          </p>

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
              <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm whitespace-pre-wrap">{error}</div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || importing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}