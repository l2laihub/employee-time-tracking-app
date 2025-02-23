import React from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Card } from './Card';

export interface ModalProps {
  /**
   * Whether the modal is visible
   */
  isOpen: boolean;

  /**
   * Callback when the modal is closed
   */
  onClose: () => void;

  /**
   * Modal title
   */
  title?: string;

  /**
   * Modal content
   */
  children: React.ReactNode;

  /**
   * Additional CSS classes for the modal container
   */
  className?: string;

  /**
   * Maximum width class for the modal
   * @default 'max-w-lg'
   */
  maxWidth?: string;
}

/**
 * Modal component for displaying content in an overlay
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = 'max-w-lg'
}: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card
        className={twMerge(
          'w-full relative animate-in fade-in zoom-in-95 duration-200',
          maxWidth,
          className
        )}
      >
        <div className="flex justify-between items-center mb-6">
          {title && (
            <h3 className="text-lg font-display font-semibold text-neutral-900">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors ml-auto"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </Card>
    </div>
  );
};

Modal.displayName = 'Modal';