import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import type { JobLocationFormData } from '../../lib/types';
import { supabase } from '../../lib/supabase';

interface ServiceType {
  id: string;
  name: string;
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['commercial', 'residential']),
  service_type: z.string().min(1, 'Service type is required'),
  is_active: z.boolean(),
  address: z.string().transform(str => str || null).nullable(),
  city: z.string().transform(str => str || null).nullable(),
  state: z.string().transform(str => str || null).nullable(),
  zip: z.string().transform(str => str || null).nullable(),
});

interface JobLocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobLocationFormData) => void;
  initialData?: JobLocationFormData;
}

export default function JobLocationForm({ isOpen, onClose, onSubmit, initialData }: JobLocationFormProps) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isLoadingServiceTypes, setIsLoadingServiceTypes] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobLocationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'commercial',
      service_type: '',
      is_active: true,
      address: null,
      city: null,
      state: null,
      zip: null,
      ...initialData,
    },
  });

  // Fetch service types from the database
  useEffect(() => {
    async function fetchServiceTypes() {
      try {
        setIsLoadingServiceTypes(true);
        
        // Fetch service types from the database
        const { data, error } = await supabase
          .from('service_types')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Error fetching service types:', error);
          // Fallback to default values
          setServiceTypes([
            { id: 'hvac', name: 'HVAC' },
            { id: 'plumbing', name: 'Plumbing' },
            { id: 'both', name: 'Both' }
          ]);
        } else {
          setServiceTypes(data || []);
        }
      } catch (error) {
        console.error('Error fetching service types:', error);
        // Fallback to default values
        setServiceTypes([
          { id: 'hvac', name: 'HVAC' },
          { id: 'plumbing', name: 'Plumbing' },
          { id: 'both', name: 'Both' }
        ]);
      } finally {
        setIsLoadingServiceTypes(false);
      }
    }
    
    fetchServiceTypes();
  }, []);

  const onSubmitForm = (data: JobLocationFormData) => {
    console.log('Form raw data:', JSON.stringify(data, null, 2));
    
    // Ensure all strings are properly trimmed and empty strings are converted to null
    const formattedData = {
      ...data,
      name: data.name?.trim() || '',  // name is required
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zip: data.zip?.trim() || null,
    };
    
    console.log('Form formatted data:', JSON.stringify(formattedData, null, 2));
    
    // Validate that required fields are not empty
    if (!formattedData.name) {
      console.error('Name is required but empty after formatting');
      return;
    }
    
    onSubmit(formattedData);
    reset();
  };

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        console.log('Setting form values with initial data:', initialData);
        reset(initialData);
      } else {
        console.log('Resetting form to default values');
        reset({
          name: '',
          type: 'commercial',
          service_type: serviceTypes.length > 0 ? serviceTypes[0].id : '',
          is_active: true,
          address: null,
          city: null,
          state: null,
          zip: null,
        });
      }
    }
  }, [isOpen, initialData, reset, serviceTypes]);

  const description = initialData 
    ? 'Update the details of this job location.' 
    : 'Fill in the details to add a new job location.';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg p-6 w-full max-w-md"
          aria-describedby="location-form-description"
        >
          <Dialog.Description className="sr-only">
            {initialData 
              ? 'Form to edit an existing job location.' 
              : 'Form to add a new job location.'
            }
          </Dialog.Description>

          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {initialData ? 'Edit' : 'Add'} Job Location
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <p id="location-form-description" className="text-sm text-gray-500 mb-4">
            {description}
          </p>
          
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter location name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
              </select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Service Type
              </label>
              <select
                {...register('service_type')}
                className="w-full px-3 py-2 border rounded-md"
                disabled={isLoadingServiceTypes}
              >
                {isLoadingServiceTypes ? (
                  <option value="">Loading service types...</option>
                ) : (
                  serviceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))
                )}
              </select>
              {errors.service_type && (
                <p className="text-sm text-red-500">{errors.service_type.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('is_active')}
                className="rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter address"
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="City"
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  {...register('state')}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="State"
                />
                {errors.state && (
                  <p className="text-sm text-red-500">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ZIP
                </label>
                <input
                  type="text"
                  {...register('zip')}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="ZIP"
                />
                {errors.zip && (
                  <p className="text-sm text-red-500">{errors.zip.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {initialData ? 'Update' : 'Add'} Location
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}