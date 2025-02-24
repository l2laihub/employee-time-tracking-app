import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.VITE_RESEND_API_KEY);

interface EmailRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  tags?: Array<{ name: string; value: string }>;
}

export const handler: Handler = async (event) => {
  // Set JSON content type for all responses
  const headers = {
    'Content-Type': 'application/json'
  };

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate API key
    if (!process.env.VITE_RESEND_API_KEY) {
      console.error('Missing VITE_RESEND_API_KEY environment variable');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service configuration error' })
      };
    }

    const { from, to, subject, html, tags } = JSON.parse(event.body || '{}') as EmailRequest;

    // Log request details
    console.log('Processing email request:', {
      to,
      from,
      subject,
      hasHtml: !!html,
      htmlLength: html?.length,
      tags,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!from || !to || !subject || !html) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Send email using Resend
    try {
      console.log('Sending email via Resend:', {
        to,
        from,
        subject,
        timestamp: new Date().toISOString()
      });

      const data = await resend.emails.send({
        from,
        to,
        subject,
        html,
        tags: tags || []
      });

      console.log('Resend API response:', {
        data,
        timestamp: new Date().toISOString()
      });

      if ('error' in data && data.error) {
        console.error('Resend API error response:', {
          error: data.error,
          timestamp: new Date().toISOString()
        });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: data.error.message || 'Failed to send email',
            details: data.error
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };
    } catch (resendError) {
      console.error('Resend API error:', {
        error: resendError,
        errorName: resendError instanceof Error ? resendError.name : 'Unknown',
        errorMessage: resendError instanceof Error ? resendError.message : 'Unknown error',
        stack: resendError instanceof Error ? resendError.stack : undefined,
        timestamp: new Date().toISOString()
      });

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: resendError instanceof Error ? resendError.message : 'Failed to send email',
          details: resendError
        })
      };
    }
  } catch (error) {
    console.error('Email sending error:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error
      })
    };
  }
}