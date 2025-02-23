import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';

export interface ImageUploadProps {
  /**
   * Current image URL
   */
  value?: string;

  /**
   * Preview URL for immediate feedback
   */
  previewUrl?: string | null;

  /**
   * Callback when image is selected
   */
  onChange: (file: File) => Promise<void>;

  /**
   * Callback when image is removed
   */
  onRemove?: () => Promise<void>;

  /**
   * Whether the upload is in progress
   */
  isLoading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Maximum file size in bytes
   * @default 5242880 (5MB)
   */
  maxSize?: number;

  /**
   * Accepted file types
   * @default ['image/jpeg', 'image/png']
   */
  accept?: string[];
}

/**
 * Image upload component with preview and validation
 */
export const ImageUpload = ({
  value,
  previewUrl,
  onChange,
  onRemove,
  isLoading,
  className,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = ['image/jpeg', 'image/png']
}: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!accept.includes(file.type)) {
      setError(`Invalid file type. Please upload ${accept.join(' or ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setError(null);
    await onChange(file);
  };

  const handleRemove = async () => {
    if (onRemove) {
      await onRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload image"
      />

      {error && (
        <p className="text-sm text-error-600 mb-2" role="alert">
          {error}
        </p>
      )}

      {(value || previewUrl) ? (
        <div className="relative w-32 h-32">
          <img
            src={previewUrl || value}
            alt="Profile"
            className="w-full h-full object-cover rounded-full"
          />
          <div className="absolute -top-2 right-0 flex gap-2">
            {!isLoading && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-primary-100 text-primary-600 rounded-full hover:bg-primary-200 transition-colors"
                  aria-label="Change photo"
                >
                  <Upload className="w-4 h-4" />
                </button>
                {onRemove && (
                  <button
                    onClick={handleRemove}
                    className="p-2 bg-error-100 text-error-600 rounded-full hover:bg-error-200 transition-colors"
                    aria-label="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 rounded-full">
              <LoadingSpinner size="sm" variant="white" />
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-32 h-32 rounded-full"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-6 h-6 mb-2" />
              <span className="text-sm">Upload Photo</span>
            </div>
          )}
        </Button>
      )}
    </div>
  );
};

ImageUpload.displayName = 'ImageUpload';