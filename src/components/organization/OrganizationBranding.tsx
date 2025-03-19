import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { HexColorPicker } from 'react-colorful';

interface BrandingFormData {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  company_name: string | null;
  company_website: string | null;
}

export function OrganizationBranding() {
  const { organization } = useOrganization();
  const [formData, setFormData] = useState<BrandingFormData>({
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    logo_url: null,
    favicon_url: null,
    company_name: null,
    company_website: null,
  });
  const [showColorPicker, setShowColorPicker] = useState<'primary' | 'secondary' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.branding) {
      setFormData({
        primary_color: organization.branding.primary_color || '#3b82f6',
        secondary_color: organization.branding.secondary_color || '#1e40af',
        logo_url: organization.branding.logo_url,
        favicon_url: organization.branding.favicon_url,
        company_name: organization.branding.company_name,
        company_website: organization.branding.company_website,
      });
    }
  }, [organization]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (!file || !organization) return;

    setIsUploading(true);
    setError(null);

    try {
      // Validate file size (max 1MB for base64)
      if (file.size > 1 * 1024 * 1024) {
        throw new Error('File size must be less than 1MB');
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        throw new Error('File must be an image (JPEG, PNG, GIF, or SVG)');
      }

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      console.log('Image converted to base64 successfully');

      // Update the form data with the base64 string
      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'favicon_url']: base64,
      }));

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          branding: formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setSuccess('Branding settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!organization) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Company Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            type="text"
            value={formData.company_name || ''}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            aria-label="Company name"
            title="Company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Website
          </label>
          <input
            type="url"
            value={formData.company_website || ''}
            onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            aria-label="Company website"
            title="Company website"
          />
        </div>

        {/* Color Pickers */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            Primary Color
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowColorPicker(prev => prev === 'primary' ? null : 'primary')}
              className="h-8 w-8 rounded border border-gray-300"
              style={{ backgroundColor: formData.primary_color }}
              aria-label="Select primary color"
              title="Select primary color"
            />
            <input
              type="text"
              value={formData.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              aria-label="Primary color hex value"
              title="Primary color hex value"
            />
          </div>
          {showColorPicker === 'primary' && (
            <div className="absolute z-10 mt-2">
              <HexColorPicker
                color={formData.primary_color}
                onChange={(color) => setFormData({ ...formData, primary_color: color })}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            Secondary Color
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowColorPicker(prev => prev === 'secondary' ? null : 'secondary')}
              className="h-8 w-8 rounded border border-gray-300"
              style={{ backgroundColor: formData.secondary_color }}
              aria-label="Select secondary color"
              title="Select secondary color"
            />
            <input
              type="text"
              value={formData.secondary_color}
              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              aria-label="Secondary color hex value"
              title="Secondary color hex value"
            />
          </div>
          {showColorPicker === 'secondary' && (
            <div className="absolute z-10 mt-2">
              <HexColorPicker
                color={formData.secondary_color}
                onChange={(color) => setFormData({ ...formData, secondary_color: color })}
              />
            </div>
          )}
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Logo</label>
          <div className="mt-1 flex items-center space-x-4">
            {formData.logo_url && (
              <img
                src={formData.logo_url}
                alt="Company Logo"
                className="h-12 w-auto object-contain"
              />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logo')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                aria-label="Upload logo"
                title="Upload logo"
              />
            </div>
          </div>
        </div>

        {/* Favicon Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Favicon</label>
          <div className="mt-1 flex items-center space-x-4">
            {formData.favicon_url && (
              <img
                src={formData.favicon_url}
                alt="Favicon"
                className="h-8 w-8 object-contain"
              />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/x-icon,image/png"
                onChange={(e) => handleFileUpload(e, 'favicon')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                aria-label="Upload favicon"
                title="Upload favicon"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Preview</h3>
        <div
          className="mt-4 p-6 rounded-lg"
          style={{ backgroundColor: formData.primary_color + '10' }}
          aria-label="Branding preview"
        >
          <div className="flex items-center space-x-4">
            {formData.logo_url && (
              <img
                src={formData.logo_url}
                alt="Company Logo"
                className="h-8 w-auto"
              />
            )}
            <div>
              <h4
                className="text-lg font-semibold"
                style={{ color: formData.primary_color }}
              >
                {formData.company_name || organization.name}
              </h4>
              {formData.company_website && (
                <a
                  href={formData.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm"
                  style={{ color: formData.secondary_color }}
                >
                  {formData.company_website}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving || isUploading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
