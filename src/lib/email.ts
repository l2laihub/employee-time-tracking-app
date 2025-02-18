import { getEmailService } from '../services/email';

interface SendInviteEmailParams {
  to: string;
  inviteCode: string;
  organizationName: string;
  inviterName: string;
  role: string;
}

export async function sendInviteEmail({
  to,
  inviteCode,
  organizationName,
  inviterName,
  role,
}: SendInviteEmailParams) {
  const inviteUrl = `${import.meta.env.VITE_APP_URL}/accept-invite?code=${inviteCode}`;

  try {
    console.log('Sending invite email with params:', {
      to,
      organizationName,
      inviterName,
      role,
      inviteUrl
    });

    const emailService = getEmailService();
    await emailService.sendInvite({
      email: to,
      organizationName,
      inviteUrl,
      role,
    });

    console.log('Invite email sent successfully');
  } catch (error) {
    console.error('Failed to send invite email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

interface SendWelcomeEmailParams {
  to: string;
  organizationName: string;
}

export async function sendWelcomeEmail({
  to,
  organizationName,
}: SendWelcomeEmailParams) {
  try {
    console.log('Sending welcome email to:', to);
    
    const emailService = getEmailService();
    await emailService.sendInvite({
      email: to,
      organizationName,
      inviteUrl: `${import.meta.env.VITE_APP_URL}/dashboard`,
      role: 'member', // Generic role for welcome email
    });

    console.log('Welcome email sent successfully');
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}
