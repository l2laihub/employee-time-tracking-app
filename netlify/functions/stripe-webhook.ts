import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { stripeService } from '../../src/services/StripeService';

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const sig = event.headers['stripe-signature'];

  if (!sig || !webhookSecret) {
    return {
      statusCode: 400,
      body: 'Webhook signature or secret missing',
    };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig,
      webhookSecret
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return {
      statusCode: 400,
      body: `Webhook Error: ${errorMessage}`,
    };
  }

  try {
    // Process the event
    await stripeService.handleWebhookEvent(stripeEvent);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing webhook: ${errorMessage}`);
    return {
      statusCode: 500,
      body: `Server Error: ${errorMessage}`,
    };
  }
};

export { handler };