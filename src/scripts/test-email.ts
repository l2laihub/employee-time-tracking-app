import { config } from 'dotenv';
import { resolve } from 'path';
import { Resend } from 'resend';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

const testEmail = process.argv[2];
if (!testEmail) {
  console.error('Please provide a test email address');
  process.exit(1);
}

// Initialize Resend client directly for testing
const apiKey = process.env.VITE_RESEND_API_KEY;
if (!apiKey) {
  console.error('VITE_RESEND_API_KEY environment variable is not set');
  process.exit(1);
}

const resend = new Resend(apiKey);

console.log('Starting email test with configuration:', {
  apiKeyLength: apiKey.length,
  testEmail,
  fromEmail: 'invites@resend.dev'
});

// Send a test email
async function sendTestEmail() {
  try {
    const result = await resend.emails.send({
      from: 'invites@resend.dev',
      to: testEmail,
      subject: 'Test Email from Employee Time Tracking App',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a56db;">Test Invite Email</h1>
          <p>This is a test email to verify the email sending functionality.</p>
          <p>If you're receiving this, the email service is working correctly!</p>
          <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
            <p style="margin: 0;">Test Organization Invite Details:</p>
            <ul style="margin-top: 10px;">
              <li>Organization: Test Company</li>
              <li>Role: Employee</li>
              <li>Invite URL: http://example.com/test-invite</li>
            </ul>
          </div>
        </div>
      `
    });

    console.log('Test email sent successfully:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Failed to send test email:', error);
    return { success: false, error };
  }
}

// Run test
sendTestEmail()
  .then(result => {
    if (result.success) {
      console.log('Email test completed successfully');
      process.exit(0);
    } else {
      console.error('Email test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });