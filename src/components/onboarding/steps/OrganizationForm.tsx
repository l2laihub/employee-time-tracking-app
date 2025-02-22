import React, { useState } from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { Industry, OrganizationSize } from '../types';

interface OrganizationFormProps {
  onSubmit: () => void;
}

const OrganizationForm: React.FC<OrganizationFormProps> = ({ onSubmit }) => {
  const { state, updateOrganization, completeStep } = useOnboarding();
  const [formData, setFormData] = useState({
    name: state.organization.name || '',
    industry: state.organization.industry || Industry.OTHER,
    size: state.organization.size || OrganizationSize.SMALL,
    website: state.organization.website || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOrganization(formData);
    completeStep('organization');
    onSubmit();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Tell us about your organization
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Organization Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter your organization name"
          />
        </div>

        {/* Industry */}
        <div>
          <label
            htmlFor="industry"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value={Industry.HEALTHCARE}>Healthcare</option>
            <option value={Industry.TECHNOLOGY}>Technology</option>
            <option value={Industry.RETAIL}>Retail</option>
            <option value={Industry.CONTRACTING}>Contracting</option>
            <option value={Industry.OTHER}>Other</option>
          </select>
        </div>

        {/* Organization Size */}
        <div>
          <label
            htmlFor="size"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Organization Size
          </label>
          <select
            id="size"
            name="size"
            value={formData.size}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value={OrganizationSize.SMALL}>1-10 employees</option>
            <option value={OrganizationSize.MEDIUM}>11-50 employees</option>
            <option value={OrganizationSize.LARGE}>51+ employees</option>
          </select>
        </div>

        {/* Website */}
        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Website (Optional)
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="https://example.com"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationForm;