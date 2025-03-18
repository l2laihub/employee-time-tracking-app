import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
  // Use setTimeout to ensure toast is not shown during render phase
  setTimeout(() => {
    if (variant === 'destructive') {
      sonnerToast.error(title || 'Error', {
        description
      });
    } else {
      sonnerToast.success(title || 'Success', {
        description
      });
    }
  }, 0);
};
