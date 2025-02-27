import React, { createContext, useContext, useState, useEffect } from 'react';
import { useOrganization } from './OrganizationContext';
import { useAuth } from './AuthContext';
import { stripeService } from '../services/StripeService';
import { supabase } from '../lib/supabase';
import { Organization } from '../types/supabase.types';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  features: Record<string, any>;
  isCustom: boolean;
  stripe_product_id?: string;
  stripe_monthly_price_id?: string;
  stripe_annual_price_id?: string;
}

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  billingCycle: 'monthly' | 'annual';
  currentPeriodEnd: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

interface SubscriptionContextType {
  currentPlan: SubscriptionPlan | null;
  subscription: Subscription | null;
  availablePlans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  
  // Simplified methods
  changePlan: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<void>;
  cancelSubscription: (immediate: boolean) => Promise<void>;
  hasFeature: (featureKey: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data when organization changes
  useEffect(() => {
    if (organization) {
      loadSubscriptionData();
    }
  }, [organization]);
  
  // Function to synchronize subscription status with Stripe
  const syncSubscriptionWithStripe = async (subscriptionId: string): Promise<string> => {
    try {
      // Call a new method in the StripeService to get the current status from Stripe
      const stripeStatus = await stripeService.getSubscriptionStatus(subscriptionId);
      
      // If the status has changed, update our local database
      if (subscription && subscription.status !== stripeStatus) {
        console.log(`Updating subscription status from ${subscription.status} to ${stripeStatus}`);
        
        await supabase
          .from('subscriptions')
          .update({
            status: stripeStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
          
        // Update the local state
        setSubscription({
          ...subscription,
          status: stripeStatus
        });
      }
      
      return stripeStatus;
    } catch (error) {
      console.error('Error syncing subscription with Stripe:', error);
      // If we can't get the status from Stripe, return the current status
      return subscription?.status || 'unknown';
    }
  };

  const loadSubscriptionData = async () => {
    if (!organization) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current subscription from the new subscriptions table
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (subscriptionError) throw subscriptionError;
      
      if (subscriptionData && subscriptionData.length > 0) {
        // Set subscription data
        setSubscription({
          id: subscriptionData[0].id,
          planId: subscriptionData[0].plan_id,
          status: subscriptionData[0].status,
          billingCycle: subscriptionData[0].billing_cycle,
          currentPeriodEnd: subscriptionData[0].current_period_end ? new Date(subscriptionData[0].current_period_end) : null,
          stripeCustomerId: subscriptionData[0].stripe_customer_id,
          stripeSubscriptionId: subscriptionData[0].stripe_subscription_id
        });
        
        // Get current plan details
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subscriptionData[0].plan_id)
          .single();
        
        if (planError) throw planError;
        
        if (planData) {
          setCurrentPlan({
            id: planData.id,
            name: planData.name,
            description: planData.description,
            type: planData.type,
            monthlyPrice: planData.monthly_price,
            annualPrice: planData.annual_price,
            features: planData.features,
            isCustom: planData.is_custom,
            stripe_product_id: planData.stripe_product_id,
            stripe_monthly_price_id: planData.stripe_monthly_price_id,
            stripe_annual_price_id: planData.stripe_annual_price_id
          });
        }
      } else {
        // No subscription found, set to free plan
        const { data: freePlan, error: freePlanError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('type', 'free')
          .single();
        
        if (freePlanError) throw freePlanError;
        
        if (freePlan) {
          setCurrentPlan({
            id: freePlan.id,
            name: freePlan.name,
            description: freePlan.description,
            type: freePlan.type,
            monthlyPrice: freePlan.monthly_price,
            annualPrice: freePlan.annual_price,
            features: freePlan.features,
            isCustom: freePlan.is_custom,
            stripe_product_id: freePlan.stripe_product_id,
            stripe_monthly_price_id: freePlan.stripe_monthly_price_id,
            stripe_annual_price_id: freePlan.stripe_annual_price_id
          });
          
          // Create a free subscription record
          const { data: newSubscription, error: newSubscriptionError } = await supabase
            .from('subscriptions')
            .insert({
              organization_id: organization.id,
              plan_id: freePlan.id,
              status: 'active',
              billing_cycle: 'monthly'
            })
            .select()
            .single();
          
          if (newSubscriptionError) throw newSubscriptionError;
          
          if (newSubscription) {
            setSubscription({
              id: newSubscription.id,
              planId: newSubscription.plan_id,
              status: newSubscription.status,
              billingCycle: newSubscription.billing_cycle,
              currentPeriodEnd: null
            });
          }
        }
      }
      
      // Load available plans
      const { data: availablePlansData, error: availablePlansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });
      
      if (availablePlansError) throw availablePlansError;
      
      if (availablePlansData) {
        setAvailablePlans(availablePlansData.map(plan => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          type: plan.type,
          monthlyPrice: plan.monthly_price,
          annualPrice: plan.annual_price,
          features: plan.features,
          isCustom: plan.is_custom,
          stripe_product_id: plan.stripe_product_id,
          stripe_monthly_price_id: plan.stripe_monthly_price_id,
          stripe_annual_price_id: plan.stripe_annual_price_id
        })));
      }
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const changePlan = async (planId: string, billingCycle: 'monthly' | 'annual' = 'monthly') => {
    if (!organization || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (planError) throw planError;
      if (!plan) throw new Error('Plan not found');
      
      // Get the price ID based on billing cycle
      const priceId = billingCycle === 'annual' ? plan.stripe_annual_price_id : plan.stripe_monthly_price_id;
      if (!priceId) throw new Error('Stripe price ID is missing for this plan. Please contact support.');
      
      // Check if there's an existing subscription
      if (subscription && subscription.stripeSubscriptionId) {
        // Sync with Stripe to ensure we have the latest status
        const stripeStatus = await syncSubscriptionWithStripe(subscription.stripeSubscriptionId);
        console.log('Synced subscription status from Stripe:', stripeStatus);
        
        // Check if the subscription is in a state that can be updated
        if (stripeStatus === 'incomplete' || stripeStatus === 'past_due') {
          // For incomplete subscriptions, we need to cancel the old one and create a new one
          // First, cancel the existing subscription
          try {
            await stripeService.cancelSubscription(subscription.stripeSubscriptionId, true);
          } catch (cancelError) {
            console.error('Error canceling incomplete subscription:', cancelError);
            // Continue anyway, as we want to create a new subscription
          }
          
          // Create a new customer or use existing one
          let customerId = subscription?.stripeCustomerId || '';
          
          if (!customerId) {
            // Create new customer in Stripe
            customerId = await stripeService.getOrCreateCustomer(
              organization.id,
              user.email || '',
              organization.name
            );
          }
          
          // Create a new subscription
          const stripeSubscription = await stripeService.createSubscription(
            organization.id,
            customerId,
            priceId
          );
          
          // Update the existing subscription record
          await supabase
            .from('subscriptions')
            .update({
              plan_id: planId,
              billing_cycle: billingCycle,
              status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubscription.id,
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);
        } else {
          // For active subscriptions, we can update them normally
          await stripeService.updateSubscription(subscription.stripeSubscriptionId, priceId);
          
          // Update subscription in database
          await supabase
            .from('subscriptions')
            .update({
              plan_id: planId,
              billing_cycle: billingCycle,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);
        }
      } else {
        // Create new subscription
        let customerId = subscription?.stripeCustomerId || '';
        
        if (!customerId) {
          // Create new customer in Stripe
          customerId = await stripeService.getOrCreateCustomer(
            organization.id,
            user.email || '',
            organization.name
          );
        }
        
        // Create subscription in Stripe
        const stripeSubscription = await stripeService.createSubscription(
          organization.id,
          customerId,
          priceId
        );
        
        // Update subscription in database
        if (subscription && subscription.id) {
          await supabase
            .from('subscriptions')
            .update({
              plan_id: planId,
              billing_cycle: billingCycle,
              status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubscription.id,
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);
        } else {
          // Create new subscription record
          await supabase
            .from('subscriptions')
            .insert({
              organization_id: organization.id,
              plan_id: planId,
              billing_cycle: billingCycle,
              status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubscription.id,
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
            });
        }
      }
      
      // Reload subscription data
      await loadSubscriptionData();
    } catch (err) {
      console.error('Error changing plan:', err);
      setError('Failed to change subscription plan');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (immediate: boolean) => {
    if (!organization || !subscription) return;
    
    // Check if there's a subscription to cancel
    if (!subscription.stripeSubscriptionId) {
      setError('No active subscription found');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await stripeService.cancelSubscription(subscription.stripeSubscriptionId, immediate);
      
      // Update subscription in database
      await supabase
        .from('subscriptions')
        .update({
          status: immediate ? 'canceled' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
      
      if (immediate) {
        // If canceled immediately, create a new subscription with the free plan
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('type', 'free')
          .single();
        
        if (freePlan) {
          await supabase
            .from('subscriptions')
            .insert({
              organization_id: organization.id,
              plan_id: freePlan.id,
              status: 'active',
              billing_cycle: 'monthly'
            });
        }
      }
      
      // Reload subscription data
      await loadSubscriptionData();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const hasFeature = (featureKey: string): boolean => {
    if (!currentPlan || !currentPlan.features) return false;
    
    return !!currentPlan.features[featureKey];
  };

  return (
    <SubscriptionContext.Provider
      value={{
        currentPlan,
        subscription,
        availablePlans,
        isLoading,
        error,
        changePlan,
        cancelSubscription,
        hasFeature
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};