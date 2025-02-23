import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  tags?: Array<{ name: string; value: string }>;
}

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { from, to, subject, html, tags } = JSON.parse(event.body || '{}') as EmailRequest;

    // Validate required fields
    if (!from || !to || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Send email using Resend
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      tags: tags || []
    });

    if ('error' in data && data.error) {
      console.error('Resend API error:', data.error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: data.error.message || 'Failed to send email'
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}