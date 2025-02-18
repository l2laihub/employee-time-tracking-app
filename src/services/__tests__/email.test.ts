import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResendEmailService, type EmailParams } from '../email';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    domains: {
      list: vi.fn().mockResolvedValue({ data: [] })
    },
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-id' })
    }
  }))
}));

// Mock React Email
vi.mock('@react-email/render', () => ({
  renderAsync: vi.fn().mockResolvedValue('<div>Mocked Email Template</div>')
}));

describe('ResendEmailService', () => {
  const apiKey = 'test-api-key';
  const fromEmail = 'test@example.com';
  let emailService: ResendEmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailService = new ResendEmailService(apiKey, fromEmail);
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new ResendEmailService('', fromEmail)).toThrow('Resend API key is required');
    });

    it('should initialize successfully with valid params', () => {
      expect(emailService).toBeInstanceOf(ResendEmailService);
    });
  });

  describe('sendInvite', () => {
    const mockParams: EmailParams = {
      email: 'recipient@example.com',
      organizationName: 'Test Org',
      inviteUrl: 'http://test.com/invite',
      role: 'employee'
    };

    it('should send invite email successfully', async () => {
      await expect(emailService.sendInvite(mockParams)).resolves.not.toThrow();
    });

    it('should handle Resend API errors', async () => {
      const error = new Error('API Error');
      vi.mocked(emailService['resend'].emails.send).mockRejectedValueOnce(error);

      await expect(emailService.sendInvite(mockParams)).rejects.toThrow();
    });

    it('should handle unauthorized recipient in development', async () => {
      const error = new Error('unauthorized recipient');
      vi.mocked(emailService['resend'].emails.send).mockRejectedValueOnce(error);

      await expect(emailService.sendInvite(mockParams)).rejects.toThrow('verified email addresses');
    });
  });
});