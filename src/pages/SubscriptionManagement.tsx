import React, { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Plan Feature List Component
const PlanFeatureList = ({ plan }: { plan: any }) => {
  return (
    <div className="mt-4 space-y-2">
      {Object.entries(plan?.features || {}).map(([key, value]) => (
        <div key={key} className="flex items-start">
          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{key}: {String(value)}</span>
        </div>
      ))}
    </div>
  );
};

// Main Subscription Management Page
const SubscriptionManagement = () => {
  const { organization } = useOrganization();
  const { 
    currentPlan, 
    subscription,
    availablePlans, 
    isLoading,
    error,
    changePlan,
    cancelSubscription,
    hasFeature
  } = useSubscription();
  
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    subscription?.billingCycle || 'monthly'
  );
  const [localError, setError] = useState<string | null>(null);
  
  const handleChangePlan = async (planId: string) => {
    // Clear any previous errors
    setError(null);
    setIsChangingPlan(true);
    try {
      await changePlan(planId, billingCycle);
    } catch (err) {
      console.error('Error changing plan:', err);
      // Display a more user-friendly error message
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to change plan. Please try again later.');
      }
    } finally {
      setIsChangingPlan(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    // Clear any previous errors
    setError(null);
    setIsCanceling(true);
    try {
      await cancelSubscription(cancelImmediately);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      // Display a more user-friendly error message
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to cancel subscription. Please try again later.');
      }
    } finally {
      setIsCanceling(false);
    }
  };
  const handleBillingCycleChange = async (cycle: 'monthly' | 'annual') => {
    // Clear any previous errors
    setError(null);
    setBillingCycle(cycle);
    
    // If there's a current plan, update the subscription with the new billing cycle
    if (currentPlan?.id) {
      // We'll let the SubscriptionContext handle the status check with Stripe
      // This ensures we're always working with the most up-to-date status
      setIsChangingPlan(true);
      try {
        await changePlan(currentPlan.id, cycle);
      } catch (err) {
        console.error('Error updating billing cycle:', err);
        // Display a more user-friendly error message
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to update billing cycle. Please try again later.');
        }
      } finally {
        setIsChangingPlan(false);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Subscription Management</h1>
      
      {(error || localError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || localError}
        </div>
      )}
      
      {/* Current Subscription Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Plan</h3>
            <p className="text-lg">{currentPlan?.name || 'Free'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="text-lg capitalize">{subscription?.status || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Billing Cycle</h3>
            <p className="text-lg capitalize">{subscription?.billingCycle || 'monthly'}</p>
          </div>
        </div>
        
        {/* Billing Cycle Toggle */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Billing Cycle</h3>
          
          {subscription?.status === 'incomplete' || subscription?.status === 'past_due' ? (
            <div className="text-amber-600 mb-2">
              <p>Cannot change billing cycle while subscription is in {subscription.status} state.</p>
              <p className="text-sm">Please complete the payment process or contact support.</p>
            </div>
          ) : null}
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleBillingCycleChange('monthly')}
              disabled={subscription?.status === 'incomplete' || subscription?.status === 'past_due'}
              className={`px-4 py-2 rounded ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              } ${(subscription?.status === 'incomplete' || subscription?.status === 'past_due') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleBillingCycleChange('annual')}
              disabled={subscription?.status === 'incomplete' || subscription?.status === 'past_due'}
              className={`px-4 py-2 rounded ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              } ${(subscription?.status === 'incomplete' || subscription?.status === 'past_due') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Annual (Save 10%)
            </button>
          </div>
        </div>
        
        {/* Cancel Subscription */}
        {subscription && subscription.status === 'active' && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Cancel Subscription</h3>
            
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="cancelImmediately"
                checked={cancelImmediately}
                onChange={(e) => setCancelImmediately(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="cancelImmediately">
                Cancel immediately (otherwise, will cancel at end of billing period)
              </label>
            </div>
            
            <button
              onClick={handleCancelSubscription}
              disabled={isCanceling}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          </div>
        )}
      </div>
      
      {/* Plan Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Plan Selection</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="plan-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Subscription Plan
            </label>
            
            {subscription?.status === 'incomplete' || subscription?.status === 'past_due' ? (
              <div className="text-amber-600 mb-2">
                <p>Cannot change plan while subscription is in {subscription.status} state.</p>
                <p className="text-sm">Please complete the payment process or contact support.</p>
              </div>
            ) : null}
            
            <select
              id="plan-select"
              className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                (subscription?.status === 'incomplete' || subscription?.status === 'past_due') ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              value={currentPlan?.id || ''}
              onChange={(e) => {
                if (e.target.value !== currentPlan?.id &&
                    subscription?.status !== 'incomplete' &&
                    subscription?.status !== 'past_due') {
                  handleChangePlan(e.target.value);
                }
              }}
              disabled={subscription?.status === 'incomplete' || subscription?.status === 'past_due'}
            >
              {availablePlans.map((plan) => {
                // Determine if the plan has a valid price ID for the current billing cycle
                const hasPriceId = billingCycle === 'annual'
                  ? !!plan.stripe_annual_price_id
                  : !!plan.stripe_monthly_price_id;
                
                // Determine the price to display based on the billing cycle
                const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                
                return (
                  <option
                    key={plan.id}
                    value={plan.id}
                    disabled={!hasPriceId}
                  >
                    {plan.name} - {price !== null ? `$${price}/${billingCycle === 'annual' ? 'yr' : 'mo'}` : 'Custom Pricing'}
                  </option>
                );
              })}
            </select>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  const selectedPlanId = (document.getElementById('plan-select') as HTMLSelectElement).value;
                  if (selectedPlanId && selectedPlanId !== currentPlan?.id) {
                    handleChangePlan(selectedPlanId);
                  }
                }}
                disabled={isChangingPlan || subscription?.status === 'incomplete' || subscription?.status === 'past_due'}
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ${
                  (subscription?.status === 'incomplete' || subscription?.status === 'past_due') ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isChangingPlan ? 'Changing Plan...' : 'Change Plan'}
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Plan Features</h3>
            <PlanFeatureList plan={currentPlan} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;