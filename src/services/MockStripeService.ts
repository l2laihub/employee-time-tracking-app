import { supabase } from '../lib/supabase';

/**
 * Mock implementation of the Stripe service for development and testing
 * Updated to work with the new subscriptions table
 */
export class MockStripeService {
  /**
   * Create or retrieve a Stripe customer for an organization
   */
  async getOrCreateCustomer(organizationId: string, email: string, name: string): Promise<string> {
    console.log('Mock: getOrCreateCustomer', { organizationId, email, name });
    
    // Check if organization already has a subscription with a Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (subscription && subscription.length > 0 && subscription[0].stripe_customer_id) {
      return subscription[0].stripe_customer_id;
    }
    
    // Generate a mock customer ID
    const mockCustomerId = `mock_cus_${Math.random().toString(36).substring(2, 15)}`;
    
    return mockCustomerId;
  }

  /**
   * Create a subscription for an organization
   */
  async createSubscription(
    organizationId: string,
    customerId: string,
    priceId: string,
    paymentMethodId?: string
  ): Promise<any> {
    console.log('Mock: createSubscription', { organizationId, customerId, priceId, paymentMethodId });
    
    // Generate a mock subscription ID
    const mockSubscriptionId = `mock_sub_${Math.random().toString(36).substring(2, 15)}`;
    
    // Return a mock subscription object
    return {
      id: mockSubscriptionId,
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
    };
  }

  /**
   * Get the current status of a subscription from Stripe
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<string> {
    console.log('Mock: getSubscriptionStatus', { subscriptionId });
    
    // Simulate different statuses based on the subscription ID
    if (subscriptionId.includes('incomplete')) {
      return 'incomplete';
    } else if (subscriptionId.includes('past_due')) {
      return 'past_due';
    } else if (subscriptionId.includes('canceled')) {
      return 'canceled';
    } else {
      return 'active';
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<any> {
    console.log('Mock: updateSubscription', { subscriptionId, newPriceId });
    
    // Simulate retrieving subscription status from Stripe
    let status = 'active';
    
    // Check if this is a subscription that should simulate being in 'incomplete' status
    if (subscriptionId.includes('incomplete')) {
      status = 'incomplete';
    } else if (subscriptionId.includes('past_due')) {
      status = 'past_due';
    }
    
    // Log the mock subscription status
    console.log('Mock Stripe subscription status:', status);
    
    // Check if the subscription is in a state that can be updated
    if (status === 'incomplete' || status === 'past_due') {
      throw new Error(`Cannot update subscription in '${status}' status. Please complete the payment process first.`);
    }
    
    // Return a mock updated subscription object
    return {
      id: subscriptionId,
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
    };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<any> {
    console.log('Mock: cancelSubscription', { subscriptionId, cancelImmediately });
    
    // Return a mock canceled subscription object
    return {
      id: subscriptionId,
      status: cancelImmediately ? 'canceled' : 'active',
      cancel_at_period_end: !cancelImmediately,
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
    };
  }

  /**
   * Get available subscription plans from Stripe
   */
  async getPlans(): Promise<any[]> {
    console.log('Mock: getPlans');
    
    // Return mock plans
    return [
      {
        id: 'mock_price_free',
        product: { name: 'Free' },
        unit_amount: 0,
        recurring: { interval: 'month' }
      },
      {
        id: 'mock_price_professional_monthly',
        product: { name: 'Professional' },
        unit_amount: 1200,
        recurring: { interval: 'month' }
      },
      {
        id: 'mock_price_professional_annual',
        product: { name: 'Professional' },
        unit_amount: 12960,
        recurring: { interval: 'year' }
      },
      {
        id: 'mock_price_business_monthly',
        product: { name: 'Business' },
        unit_amount: 2000,
        recurring: { interval: 'month' }
      },
      {
        id: 'mock_price_business_annual',
        product: { name: 'Business' },
        unit_amount: 21600,
        recurring: { interval: 'year' }
      }
    ];
  }

  /**
   * Get customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<any[]> {
    console.log('Mock: getPaymentMethods', { customerId });
    
    // Return mock payment methods
    return [
      {
        id: 'mock_pm_1',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      }
    ];
  }

  /**
   * Create a setup intent for adding a payment method
   */
  async createSetupIntent(customerId: string): Promise<any> {
    console.log('Mock: createSetupIntent', { customerId });
    
    // Return a mock setup intent
    return {
      client_secret: 'mock_seti_secret_' + Math.random().toString(36).substring(2, 15)
    };
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhookEvent(event: any): Promise<void> {
    console.log('Mock: handleWebhookEvent', { event });
    // No-op for mock implementation
  }
}

// Export singleton instance
export const mockStripeService = new MockStripeService();