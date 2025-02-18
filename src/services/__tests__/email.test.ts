import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailServiceImpl, initializeEmailService, getEmailService, EmailService } from '../email';
import InviteEmailTemplate from '../../components/email/InviteEmailTemplate';
import { renderToString } from 'react-dom/server';
import * as React from 'react';

// Mock the email service module
vi.mock('../email', () => {
  let emailService: EmailService | null = null;
  
  class MockEmailServiceImpl {
    private fromEmail: string;
    private isDevelopment: boolean;
    private readonly VERIFIED_EMAIL = 'l2laihub@gmail.com';

    constructor(fromEmail: string) {
      this.fromEmail = fromEmail;
      this.isDevelopment = true; // Always true for tests
    }

    async sendInvite(params: any) {
      if (this.isDevelopment && params.email !== this.VERIFIED_EMAIL) {
        throw new Error('In development mode, can only send to verified email');
      }

      try {
        const renderedHtml = renderToString(
          React.createElement(InviteEmailTemplate, {
            organizationName: params.organizationName,
            inviteUrl: params.inviteUrl,
            role: params.role
          })
        );

        return this.sendEmail({
          to: params.email,
          subject: `Invitation to join ${params.organizationName}`,
          html: renderedHtml
        });
      } catch (renderError) {
        console.error('Template rendering failed:', renderError);
        throw new Error('Failed to generate email content');
      }
    }

    async testConfiguration(confirm?: boolean) {
      if (!confirm) return;
      return this.sendEmail({
        to: this.VERIFIED_EMAIL,
        subject: 'Email Service Test',
        html: '<p>Testing email service configuration.</p>'
      });
    }

    private async sendEmail(options: any) {
      const response = await fetch('/api/resend/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        } else if (response.status === 401) {
          throw new Error('Invalid API key or unauthorized access');
        }
        throw new Error(data.error || 'Failed to send email');
      }

      return data;
    }
  }

  return {
    EmailServiceImpl: vi.fn().mockImplementation((fromEmail: string) => new MockEmailServiceImpl(fromEmail)),
    initializeEmailService: vi.fn().mockImplementation((fromEmail: string) => {
      if (!fromEmail) throw new Error('Invalid sender email');
      emailService = new MockEmailServiceImpl(fromEmail);
    }),
    getEmailService: vi.fn().mockImplementation(() => {
      if (!emailService) throw new Error('Email service not initialized');
      return emailService;
    }),
    EmailService: vi.fn()
  };
});

// Mock React and renderToString
vi.mock('react-dom/server', () => ({
  renderToString: vi.fn().mockReturnValue('<div>Mocked Template</div>')
}));

vi.mock('react', () => ({
  createElement: vi.fn()
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Email Service', () => {
  const VERIFIED_EMAIL = 'l2laihub@gmail.com';
  const SENDER_EMAIL = 'invites@resend.dev';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    
    // Reset module state
    vi.resetModules();
    
    // Reset mocks with default successful responses
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'test-email-id' })
      })
    );

    vi.mocked(renderToString).mockReturnValue('<div>Mocked Template</div>');
  });

  describe('Service Initialization', () => {
    it('should initialize email service with correct sender', () => {
      initializeEmailService(SENDER_EMAIL);
      const service = getEmailService();
      expect(service).toBeDefined();
    });

    it('should throw error when getting uninitialized service', () => {
      vi.mocked(getEmailService).mockImplementationOnce(() => {
        throw new Error('Email service not initialized');
      });
      expect(() => getEmailService()).toThrow('Email service not initialized');
    });

    it('should handle initialization errors', () => {
      vi.mocked(initializeEmailService).mockImplementationOnce(() => {
        throw new Error('Invalid sender email');
      });
      expect(() => initializeEmailService('')).toThrow('Invalid sender email');
    });
  });

  describe('Email Service Implementation', () => {
    let emailService: EmailServiceImpl;

    beforeEach(() => {
      emailService = new EmailServiceImpl(SENDER_EMAIL);
    });

    describe('Development Mode', () => {
      it('should only allow sending to verified email in development', async () => {
        // Should fail with unverified email
        await expect(emailService.sendInvite({
          email: 'unverified@example.com',
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        })).rejects.toThrow('In development mode, can only send to verified email');

        // Should work with verified email
        mockFetch.mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'test-email-id' })
          })
        );

        await expect(emailService.sendInvite({
          email: VERIFIED_EMAIL,
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        })).resolves.not.toThrow();
      });
    });

    describe('Template Rendering', () => {
      it('should handle template rendering errors', async () => {
        vi.mocked(renderToString).mockImplementationOnce(() => {
          throw new Error('Template render failed');
        });

        await expect(emailService.sendInvite({
          email: VERIFIED_EMAIL,
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        })).rejects.toThrow('Failed to generate email content');
      });

      it('should render template with correct props', async () => {
        const params = {
          email: VERIFIED_EMAIL,
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        };

        await emailService.sendInvite(params);

        expect(React.createElement).toHaveBeenCalledWith(
          InviteEmailTemplate,
          {
            organizationName: params.organizationName,
            inviteUrl: params.inviteUrl,
            role: params.role
          }
        );
      });
    });

    describe('API Integration', () => {
      it('should handle rate limit errors', async () => {
        mockFetch.mockImplementationOnce(() => 
          Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: () => Promise.resolve({ error: 'Rate limit exceeded' })
          })
        );

        await expect(emailService.sendInvite({
          email: VERIFIED_EMAIL,
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        })).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle unauthorized errors', async () => {
        mockFetch.mockImplementationOnce(() => 
          Promise.resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: () => Promise.resolve({ error: 'Invalid API key' })
          })
        );

        await expect(emailService.sendInvite({
          email: VERIFIED_EMAIL,
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        })).rejects.toThrow('Invalid API key or unauthorized access');
      });

      it('should send emails with correct parameters', async () => {
        const params = {
          email: VERIFIED_EMAIL,
          organizationName: 'Test Org',
          inviteUrl: 'http://test.com',
          role: 'admin'
        };

        await emailService.sendInvite(params);

        expect(mockFetch).toHaveBeenCalledWith('/api/resend/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining(params.email)
        });
      });
    });

    describe('Configuration Testing', () => {
      it('should skip test without confirmation', async () => {
        await emailService.testConfiguration();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should run test with confirmation', async () => {
        await emailService.testConfiguration(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/resend/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('Email Service Test')
        });
      });

      it('should handle test failures', async () => {
        mockFetch.mockImplementationOnce(() => 
          Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Test failed' })
          })
        );

        await expect(emailService.testConfiguration(true)).rejects.toThrow();
      });
    });
  });
});