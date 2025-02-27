import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

/**
 * Service for handling Stripe subscription and payment operations
 * Updated to work with the new subscriptions table
 */
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is not defined in environment variables');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia', // Use the latest stable API version
    });
  }

  /**
   * Create or retrieve a Stripe customer for an organization
   */
  async getOrCreateCustomer(organizationId: string, email: string, name: string): Promise<string> {
    try {
      // Check if organization already has a subscription with a Stripe customer ID
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If customer ID exists, return it
      if (subscription?.stripe_customer_id) {
        return subscription.stripe_customer_id;
      }

      // Create new customer in Stripe
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId
        }
      });

      return customer.id;
    } catch (error) {
      console.error('Error creating/retrieving Stripe customer:', error);
      throw new Error('Failed to create or retrieve Stripe customer');
    }
  }

  /**
   * Create a subscription for an organization
   */
  async createSubscription(
    organizationId: string,
    customerId: string,
    priceId: string,
    paymentMethodId?: string
  ): Promise<Stripe.Subscription> {
    try {
      // If payment method provided, attach it to the customer
      if (paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Set as default payment method
        await this.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create the subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId
        }
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Get the current status of a subscription from Stripe
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<string> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription.status;
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw new Error('Failed to get subscription status from Stripe');
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    try {
      // Get current subscription directly from Stripe to ensure we have the latest status
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      // Log the actual subscription status from Stripe
      console.log('Stripe subscription status:', subscription.status);
      
      // Check if the subscription is in a state that can be updated
      if (subscription.status === 'incomplete' || subscription.status === 'past_due') {
        throw new Error(`Cannot update subscription in '${subscription.status}' status. Please complete the payment process first.`);
      }

      // Get the subscription item ID
      const subscriptionItemId = subscription.items.data[0].id;

      // Update the subscription with the new price
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          items: [{
            id: subscriptionItemId,
            price: newPriceId,
          }],
          proration_behavior: 'create_prorations',
        }
      );

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      // Provide more specific error message
      if (error instanceof Error) {
        throw new Error(`Failed to update subscription: ${error.message}`);
      } else {
        throw new Error('Failed to update subscription');
      }
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: !cancelImmediately,
        }
      );

      if (cancelImmediately) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      }

      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Get available subscription plans from Stripe
   */
  async getPlans(): Promise<Stripe.Price[]> {
    try {
      const prices = await this.stripe.prices.list({
        active: true,
        expand: ['data.product'],
      });

      return prices.data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  /**
   * Get customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw new Error('Failed to fetch payment methods');
    }
  }

  /**
   * Create a setup intent for adding a payment method
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });

      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw new Error('Failed to create setup intent');
    }
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      const eventType = event.type;

      switch (eventType) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw new Error('Failed to process webhook event');
    }
  }

  /**
   * Handle successful payment webhook
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;
      const customerId = invoice.customer as string;

      // Get subscription from Stripe customer ID
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, organization_id')
        .eq('stripe_customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subscriptions || subscriptions.length === 0) {
        console.error(`No subscription found for Stripe customer ${customerId}`);
        return;
      }

      const subscription = subscriptions[0];

      // Record successful payment
      await supabase
        .from('subscription_transactions')
        .insert({
          organization_id: subscription.organization_id,
          subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent,
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: 'succeeded',
          billing_reason: invoice.billing_reason,
          invoice_pdf_url: invoice.invoice_pdf,
          period_start: new Date(invoice.period_start * 1000),
          period_end: new Date(invoice.period_end * 1000)
        });

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
    }
  }

  /**
   * Handle failed payment webhook
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;
      const customerId = invoice.customer as string;

      // Get subscription from Stripe customer ID
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, organization_id, status')
        .eq('stripe_customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subscriptions || subscriptions.length === 0) {
        console.error(`No subscription found for Stripe customer ${customerId}`);
        return;
      }

      const subscription = subscriptions[0];

      // Record failed payment
      await supabase
        .from('subscription_transactions')
        .insert({
          organization_id: subscription.organization_id,
          subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent,
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          status: 'failed',
          billing_reason: invoice.billing_reason,
          invoice_pdf_url: invoice.invoice_pdf,
          period_start: new Date(invoice.period_start * 1000),
          period_end: new Date(invoice.period_end * 1000)
        });

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
    }
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;

      // Get subscription from Stripe customer ID
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subscriptions || subscriptions.length === 0) {
        console.error(`No subscription found for Stripe customer ${customerId}`);
        return;
      }

      const subscriptionRecord = subscriptions[0];

      // Update subscription details
      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionRecord.id);

    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;

      // Get subscription from Stripe customer ID
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, organization_id')
        .eq('stripe_customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subscriptions || subscriptions.length === 0) {
        console.error(`No subscription found for Stripe customer ${customerId}`);
        return;
      }

      const subscriptionRecord = subscriptions[0];

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionRecord.id);

      // Get free plan
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('type', 'free')
        .single();

      if (freePlan) {
        // Create a new subscription with the free plan
        await supabase
          .from('subscriptions')
          .insert({
            organization_id: subscriptionRecord.organization_id,
            plan_id: freePlan.id,
            status: 'active',
            billing_cycle: 'monthly'
          });
      }

    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();