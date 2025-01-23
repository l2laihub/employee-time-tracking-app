import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

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
    await resend.emails.send({
      from: 'Employee Time Tracking <no-reply@employeetimetracking.app>',
      to: [to],
      subject: `You've been invited to join ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You've been invited to join ${organizationName}</h2>
          
          <p>Hi there,</p>
          
          <p>${inviterName} has invited you to join ${organizationName} as a ${role}.</p>
          
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This invitation will expire in 7 days. If you don't have an account, 
            you'll be able to create one when you accept the invitation.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #6b7280; font-size: 12px;">
            If you weren't expecting this invitation, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send invite email:', error);
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
    await resend.emails.send({
      from: 'Employee Time Tracking <no-reply@employeetimetracking.app>',
      to: [to],
      subject: `Welcome to ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to ${organizationName}</h2>
          
          <p>Hi there,</p>
          
          <p>Welcome to ${organizationName}! You're now part of the team.</p>
          
          <div style="margin: 30px 0;">
            <a href="${import.meta.env.VITE_APP_URL}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p>Here are a few things you can do to get started:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Set up your work schedule</li>
            <li>Track your first time entry</li>
          </ul>
          
          <p>If you have any questions, feel free to reach out to your organization administrator.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #6b7280; font-size: 12px;">
            This email was sent by Employee Time Tracking App.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}
