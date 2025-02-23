import InviteEmailTemplate from '../components/email/InviteEmailTemplate';
import * as React from 'react';
import { renderToString } from 'react-dom/server';

export interface EmailParams {
  email: string;
  organizationName: string;
  inviteUrl: string;
  role: string;
}

export interface EmailService {
  sendInvite(params: EmailParams): Promise<void>;
  testConfiguration(): Promise<void>;
}

export class EmailServiceImpl implements EmailService {
  private fromEmail: string;
  private isDevelopment: boolean;
  private readonly VERIFIED_EMAIL = 'l2laihub@gmail.com';
  private readonly SENDER_EMAIL = 'invites@resend.dev';

  constructor(fromEmail: string) {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.fromEmail = this.SENDER_EMAIL; // Always use Resend's verified domain

    console.log('Initializing EmailService:', {
      fromEmail,
      isDevelopment: this.isDevelopment,
      verifiedEmail: this.VERIFIED_EMAIL,
      mode: import.meta.env.MODE,
      timestamp: new Date().toISOString()
    });

    if (this.isDevelopment) {
      console.log('Development mode active:', {
        message: 'Emails can only be sent to verified addresses',
        verifiedEmail: this.VERIFIED_EMAIL,
        senderEmail: this.fromEmail
      });
    }
  }

  private async sendEmail(options: {
    to: string;
    from?: string;
    subject: string;
    html: string;
    tags?: Array<{ name: string; value: string }>;
  }): Promise<void> {
    // Use the full Netlify function path
    const response = await fetch('/.netlify/functions/resend-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.fromEmail,
        ...options
      })
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
        throw new Error('Invalid response from email service');
      }
    } else {
      // Handle non-JSON response (like 404 HTML pages)
      const text = await response.text();
      console.error('Non-JSON response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        text: text.substring(0, 200) // Log first 200 chars
      });
      throw new Error(`Email service error: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      console.error('Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toISOString()
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key or unauthorized access.');
      } else if (response.status === 403) {
        if (this.isDevelopment && options.to !== this.VERIFIED_EMAIL) {
          throw new Error(
            `In development mode, recipient email (${options.to}) must be verified. ` +
            `Please use the verified test email: ${this.VERIFIED_EMAIL}`
          );
        } else if (options.from !== this.SENDER_EMAIL) {
          throw new Error(
            `Invalid sender email (${options.from}). ` +
            `Must use Resend's verified domain: ${this.SENDER_EMAIL}`
          );
        } else {
          throw new Error('Email sending failed: Forbidden. Check Resend dashboard for details.');
        }
      } else if (response.status === 404) {
        throw new Error('Email service endpoint not found. Please check deployment configuration.');
      }

      throw new Error(data.message || data.error?.message || 'Failed to send email');
    }

    console.log('Resend API success:', {
      id: data.id,
      timestamp: new Date().toISOString()
    });

    return data;
  }

  public async testConfiguration(confirmTest?: boolean): Promise<void> {
    if (!confirmTest) {
      console.log('Test configuration skipped - requires explicit confirmation');
      return;
    }
    try {
      console.log('Starting email configuration test:', {
        isDevelopment: this.isDevelopment,
        fromEmail: this.fromEmail,
        verifiedRecipient: this.VERIFIED_EMAIL,
        mode: import.meta.env.MODE,
        timestamp: new Date().toISOString()
      });
      
      if (this.isDevelopment) {
        console.log('Development mode test:', {
          message: 'Sending test email to verified address',
          to: this.VERIFIED_EMAIL,
          from: this.fromEmail,
          note: 'Using Resend verified domain for sending'
        });
      }

      await this.sendEmail({
        to: this.VERIFIED_EMAIL,
        subject: 'Email Service Test',
        html: '<p>Testing email service configuration.</p>',
        tags: [
          { name: 'type', value: 'test' },
          { name: 'env', value: this.isDevelopment ? 'dev' : 'prod' }
        ]
      });

      console.log('Email configuration test successful:', {
        fromEmail: this.fromEmail,
        isDevelopment: this.isDevelopment,
        verifiedEmail: this.VERIFIED_EMAIL,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Email configuration test failed:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async sendInvite(params: EmailParams): Promise<void> {
    const startTime = new Date();
    console.log('Starting invite email send process:', {
      to: params.email,
      organization: params.organizationName,
      role: params.role,
      isDevelopment: this.isDevelopment,
      timestamp: startTime.toISOString()
    });

    try {
      // Development mode verification
      if (this.isDevelopment && params.email !== this.VERIFIED_EMAIL) {
        console.error('Email not verified in development mode:', params.email);
        throw new Error(
          `In development mode, can only send to verified email (${this.VERIFIED_EMAIL}). ` +
          'Please use the verified email address for testing.'
        );
      }

      // Log template rendering
      console.log('Rendering invite email template...');
      try {
        const renderedHtml = renderToString(
          React.createElement(InviteEmailTemplate, {
            organizationName: params.organizationName,
            inviteUrl: params.inviteUrl,
            role: params.role
          })
        );
        
        console.log('Template rendered successfully:', {
          length: renderedHtml.length,
          hasContent: renderedHtml.length > 0
        });

        // Send email
        console.log('Sending invite email...', {
          to: params.email,
          from: this.fromEmail,
          subject: `Invitation to join ${params.organizationName}`,
          contentLength: renderedHtml.length
        });

        await this.sendEmail({
          to: params.email,
          subject: `Invitation to join ${params.organizationName}`,
          html: renderedHtml,
          tags: [
            { name: 'type', value: 'invite' },
            { name: 'environment', value: this.isDevelopment ? 'development' : 'production' },
            { name: 'org', value: params.organizationName.replace(/[^a-zA-Z0-9_-]/g, '_') }
          ]
        });
      } catch (renderError) {
        console.error('Template rendering failed:', renderError);
        throw new Error('Failed to generate email content');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log('Email sent successfully:', {
        to: params.email,
        duration: `${duration}ms`,
        timestamp: endTime.toISOString(),
        environment: this.isDevelopment ? 'development' : 'production'
      });
    } catch (error) {
      console.error('Failed to send invite email:', {
        error,
        email: params.email,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString()
      });

      if (error instanceof Error) {
        console.error('Detailed error information:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          isDevelopment: this.isDevelopment
        });

        if (error.message.includes('rate limit')) {
          throw new Error('Email sending failed: Rate limit exceeded. Please try again later.');
        }
      }
      throw error;
    }
  }
}

// Create singleton instance
let emailService: EmailService | null = null;

export const initializeEmailService = (fromEmail: string): void => {
  console.log('Initializing email service:', {
    fromEmail,
    isDevelopment: import.meta.env.MODE === 'development',
    timestamp: new Date().toISOString()
  });

  try {
    emailService = new EmailServiceImpl(fromEmail);
    console.log('Email service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    throw error;
  }
};

export const getEmailService = (): EmailService => {
  if (!emailService) {
    console.error('Email service not initialized');
    throw new Error('Email service not initialized');
  }
  return emailService;
};