import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
  if (variant === 'destructive') {
    sonnerToast.error(title || 'Error', {
      description
    });
  } else {
    sonnerToast.success(title || 'Success', {
      description
    });
  }
};
