import { getEmailService } from '../services/email';

export async function testEmailService(testEmail: string) {
  try {
    console.log('Starting email service test...');
    
    const emailService = getEmailService();
    console.log('Email service retrieved successfully');

    // Send a test invite email
    await emailService.sendInvite({
      email: testEmail,
      organizationName: 'Test Organization',
      inviteUrl: 'http://localhost:5173/test-invite',
      role: 'employee'
    });

    console.log('Test email sent successfully to:', testEmail);
    return {
      success: true,
      message: 'Test email sent successfully'
    };
  } catch (error) {
    console.error('Failed to send test email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send test email',
      error
    };
  }
}