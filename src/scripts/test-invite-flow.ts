import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const resendApiKey = process.env.VITE_RESEND_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
  console.error('Missing required environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    hasResendKey: !!resendApiKey
  });
  process.exit(1);
}

// Initialize clients
const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);
const resend = new Resend(resendApiKey as string);

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function testInviteFlow() {
  try {
    console.log('Starting invite flow test...');

    // Get test organization
    console.log('Getting test organization...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (orgError) {
      throw new Error(`Failed to get test organization: ${orgError.message}`);
    }

    if (!orgData) {
      throw new Error('No test organization found');
    }

    console.log('Using organization:', {
      id: orgData.id,
      name: orgData.name
    });

    // Generate invite code
    const inviteCode = generateInviteCode();
    console.log('Generated invite code:', inviteCode);

    // Create test invite
    console.log('Creating test invite...');
    const { data: inviteData, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        email: 'l2laihub@gmail.com',
        organization_id: orgData.id,
        role: 'employee',
        status: 'pending',
        invite_code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (inviteError) {
      throw new Error(`Failed to create invite: ${inviteError.message}`);
    }

    console.log('Invite created:', inviteData);

    // Send test email with simple template
    console.log('Sending test email...');
    const result = await resend.emails.send({
      from: 'invites@resend.dev',
      to: 'l2laihub@gmail.com',
      subject: `Invitation to join ${orgData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Join ${orgData.name}</h1>
          <p>You've been invited to join ${orgData.name} as an employee.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/accept-invite?code=${inviteCode}"
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
          <p style="margin-top: 24px; color: #666;">
            This invitation will expire in 7 days.
          </p>
        </div>
      `
    });

    console.log('Email sent:', result);
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
}

// Run test
testInviteFlow().catch(console.error);