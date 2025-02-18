import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeEmailService, getEmailService, EmailService } from '../services/email';

interface EmailContextType {
  emailService: EmailService | null;
  isInitialized: boolean;
  error: Error | null;
}

const EmailContext = createContext<EmailContextType>({
  emailService: null,
  isInitialized: false,
  error: null
});

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};

interface EmailProviderProps {
  children: React.ReactNode;
}

export function EmailProvider({ children }: EmailProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [emailService, setEmailService] = useState<EmailService | null>(null);

  // Debug environment variables on mount
  useEffect(() => {
    console.log('Environment check:', {
      mode: import.meta.env.MODE,
      hasResendKey: !!import.meta.env.VITE_RESEND_API_KEY,
      resendKeyLength: import.meta.env.VITE_RESEND_API_KEY?.length || 0,
      appUrl: import.meta.env.VITE_APP_URL,
      timestamp: new Date().toISOString()
    });
  }, []);

  useEffect(() => {
    const initializeEmail = async () => {
      const startTime = new Date();
      console.log('Starting email service initialization...', {
        isInitialized,
        hasError: !!error,
        mode: import.meta.env.MODE,
        timestamp: startTime.toISOString()
      });

      // Clear any existing service
      if (emailService) {
        console.log('Clearing existing email service');
        setEmailService(null);
        setIsInitialized(false);
      }

      const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
      if (!resendApiKey) {
        const errorMsg = 'VITE_RESEND_API_KEY not found in environment variables';
        console.error(errorMsg, {
          envKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
          timestamp: new Date().toISOString()
        });
        setError(new Error(errorMsg));
        return;
      }

      try {
        // Always use Resend's verified domain as sender
        const senderEmail = 'invites@resend.dev';

        console.log('Configuring email service:', {
          mode: import.meta.env.MODE,
          apiKeyLength: resendApiKey.length,
          senderEmail,
          timestamp: new Date().toISOString()
        });
        
        // Initialize and verify the service
        console.log('Initializing email service...', {
          senderEmail,
          mode: import.meta.env.MODE,
          timestamp: new Date().toISOString()
        });

        initializeEmailService(senderEmail);
        const service = getEmailService();
        
        // Test configuration disabled to prevent rate limiting
        // To test manually, call emailService.testConfiguration() directly when needed

        const endTime = new Date();
        console.log('Email service initialized and verified:', {
          hasService: !!service,
          senderEmail,
          mode: import.meta.env.MODE,
          duration: `${endTime.getTime() - startTime.getTime()}ms`,
          timestamp: endTime.toISOString()
        });
        
        setEmailService(service);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorDetails = {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        };
        console.error('Failed to initialize email service:', errorDetails);
        setError(err instanceof Error ? err : new Error('Failed to initialize email service'));
        setIsInitialized(false);
        setEmailService(null);
      }
    };

    if (!isInitialized && !error) {
      initializeEmail();
    }
  }, [isInitialized, error, emailService]);

  const value = {
    emailService,
    isInitialized,
    error
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
}