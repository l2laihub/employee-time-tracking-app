# Custom Subscription Plans: Technical Implementation Guide

## Overview

This document outlines the technical implementation details for supporting custom subscription plans in the ClockFlow system. It focuses on the necessary code and architecture changes to enable flexible pricing arrangements such as the example case of $99/month for 15 users.

## System Architecture Changes

### 1. Database Schema Updates

#### Subscription Plans Table

Add support for custom plans in the subscription_plans table:

```sql
ALTER TABLE subscription_plans
ADD COLUMN is_custom BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN max_users INTEGER,
ADD COLUMN min_users INTEGER,
ADD COLUMN effective_per_user_price DECIMAL(10,2),
ADD COLUMN discount_percentage DECIMAL(5,2),
ADD COLUMN approval_reference VARCHAR(255),
ADD COLUMN approved_by VARCHAR(255),
ADD COLUMN approval_date TIMESTAMP;
```

#### Custom Plan Metadata Table

Create a new table to store additional custom plan details:

```sql
CREATE TABLE custom_plan_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    client_id UUID REFERENCES organizations(id) NOT NULL,
    justification TEXT,
    renewal_strategy VARCHAR(50),
    next_review_date TIMESTAMP,
    migration_path VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    special_terms TEXT
);
```

### 2. API Endpoints

#### New Endpoints

1. **Create Custom Plan**
   ```
   POST /api/admin/subscription-plans/custom
   ```
   
   Request body:
   ```json
   {
     "name": "Custom Essentials - 15 Users",
     "description": "Custom plan based on Essentials tier",
     "parentPlanId": "essentials-plan-id",
     "price": 99.00,
     "annualPrice": 1069.20,
     "currency": "USD",
     "maxUsers": 15,
     "minUsers": 15,
     "features": ["feature1", "feature2", "..."],
     "clientId": "client-organization-id",
     "justification": "Strategic account with growth potential",
     "approvedBy": "manager@company.com",
     "renewalStrategy": "review_for_standard",
     "specialTerms": "Additional terms..."
   }
   ```

2. **Get Custom Plans**
   ```
   GET /api/admin/subscription-plans/custom
   ```

3. **Get Custom Plan Details**
   ```
   GET /api/admin/subscription-plans/custom/:id
   ```

4. **Update Custom Plan**
   ```
   PUT /api/admin/subscription-plans/custom/:id
   ```

5. **Assign Custom Plan to Organization**
   ```
   POST /api/admin/organizations/:id/assign-plan
   ```
   
   Request body:
   ```json
   {
     "planId": "custom-plan-id",
     "startDate": "2025-03-01",
     "endDate": "2026-02-28"
   }
   ```

#### Modified Endpoints

1. **Update User Management API**
   - Add user limit validation based on subscription plan
   - Implement warning notifications when approaching limits

2. **Update Billing API**
   - Support custom billing cycles
   - Handle custom plan invoicing

### 3. Service Layer Changes

#### Subscription Service

```typescript
// Add methods to SubscriptionService

async createCustomPlan(customPlanData: CustomPlanInput): Promise<SubscriptionPlan> {
  // Validate the custom plan data
  this.validateCustomPlan(customPlanData);
  
  // Calculate derived values
  const effectivePerUserPrice = customPlanData.price / customPlanData.maxUsers;
  
  // Get parent plan for comparison
  const parentPlan = await this.getPlanById(customPlanData.parentPlanId);
  
  // Calculate discount percentage
  const standardPrice = parentPlan.perUserPrice * customPlanData.maxUsers;
  const discountPercentage = ((standardPrice - customPlanData.price) / standardPrice) * 100;
  
  // Create the plan in the database
  const planId = await this.plansRepository.createCustomPlan({
    ...customPlanData,
    isCustom: true,
    effectivePerUserPrice,
    discountPercentage
  });
  
  // Create metadata record
  await this.customPlanMetadataRepository.create({
    planId,
    clientId: customPlanData.clientId,
    justification: customPlanData.justification,
    renewalStrategy: customPlanData.renewalStrategy,
    nextReviewDate: this.calculateNextReviewDate(customPlanData),
    specialTerms: customPlanData.specialTerms,
    createdBy: customPlanData.approvedBy
  });
  
  // Log the custom plan creation
  await this.auditLogService.logEvent({
    eventType: 'CUSTOM_PLAN_CREATED',
    userId: customPlanData.approvedBy,
    entityId: planId,
    metadata: {
      clientId: customPlanData.clientId,
      discountPercentage,
      justification: customPlanData.justification
    }
  });
  
  return this.getPlanById(planId);
}

async validateUserLimit(organizationId: string, requestedUserCount: number): Promise<ValidationResult> {
  // Get organization's subscription
  const subscription = await this.getActiveSubscription(organizationId);
  
  // Get the plan
  const plan = await this.getPlanById(subscription.planId);
  
  // Check if custom plan with user limits
  if (plan.isCustom && plan.maxUsers) {
    if (requestedUserCount > plan.maxUsers) {
      return {
        valid: false,
        message: `Your plan has a limit of ${plan.maxUsers} users. Please contact sales to increase your limit.`,
        currentLimit: plan.maxUsers,
        requestedCount: requestedUserCount
      };
    }
    
    // Check if approaching limit for notifications
    if (requestedUserCount >= plan.maxUsers * 0.8) {
      // Trigger notification but allow operation
      this.notificationService.sendUserLimitWarning(organizationId, requestedUserCount, plan.maxUsers);
    }
  }
  
  return { valid: true };
}
```

#### Billing Service

```typescript
// Add methods to BillingService

async generateInvoiceForCustomPlan(subscriptionId: string): Promise<Invoice> {
  const subscription = await this.subscriptionRepository.findById(subscriptionId);
  const plan = await this.planRepository.findById(subscription.planId);
  
  // For custom plans, use the fixed price rather than calculating based on user count
  if (plan.isCustom) {
    return this.createInvoice({
      subscriptionId,
      organizationId: subscription.organizationId,
      amount: subscription.isAnnual ? plan.annualPrice : plan.price,
      currency: plan.currency,
      description: `${plan.name} - ${subscription.isAnnual ? 'Annual' : 'Monthly'} Subscription`,
      items: [{
        description: plan.name,
        quantity: 1,
        unitPrice: subscription.isAnnual ? plan.annualPrice : plan.price,
        amount: subscription.isAnnual ? plan.annualPrice : plan.price
      }]
    });
  }
  
  // Standard plan billing logic...
}
```

### 4. User Interface Changes

#### Admin Portal

1. **Custom Plan Creation Form**
   - Parent plan selection
   - Price configuration
   - User limit settings
   - Feature customization
   - Approval workflow
   - Client association

2. **Custom Plan Management Dashboard**
   - List of all custom plans
   - Filtering and sorting options
   - Renewal tracking
   - Performance metrics

3. **Organization Subscription Management**
   - Custom plan assignment
   - User limit visualization
   - Upgrade/downgrade options

#### Client Portal

1. **Subscription Information Page**
   - Display custom plan details
   - Show user limit and current usage
   - Provide upgrade options

2. **User Management Enhancements**
   - Clear indication of user limits
   - Warning when approaching limits
   - Streamlined process for requesting limit increases

## Implementation Phases

### Phase 1: Core Database and API Changes

1. Update database schema
2. Implement basic API endpoints
3. Update subscription service
4. Add user limit validation

### Phase 2: Admin Portal Updates

1. Create custom plan management UI
2. Implement approval workflow
3. Add reporting and analytics

### Phase 3: Billing Integration

1. Update billing service
2. Implement custom invoicing
3. Add payment processing for custom plans

### Phase 4: Client-Facing Features

1. Update client portal
2. Implement user limit notifications
3. Add upgrade request workflow

## Testing Strategy

### Unit Tests

```typescript
// Example test for user limit validation
describe('SubscriptionService.validateUserLimit', () => {
  it('should return valid for standard plans', async () => {
    // Arrange
    const organizationId = 'org-123';
    const requestedUserCount = 10;
    
    // Mock standard plan
    mockPlanRepository.findById.mockResolvedValue({
      id: 'plan-123',
      isCustom: false
    });
    
    mockSubscriptionRepository.findActiveByOrganization.mockResolvedValue({
      planId: 'plan-123'
    });
    
    // Act
    const result = await subscriptionService.validateUserLimit(organizationId, requestedUserCount);
    
    // Assert
    expect(result.valid).toBe(true);
  });
  
  it('should return invalid when exceeding custom plan limit', async () => {
    // Arrange
    const organizationId = 'org-123';
    const requestedUserCount = 16;
    
    // Mock custom plan with 15 user limit
    mockPlanRepository.findById.mockResolvedValue({
      id: 'custom-plan-123',
      isCustom: true,
      maxUsers: 15
    });
    
    mockSubscriptionRepository.findActiveByOrganization.mockResolvedValue({
      planId: 'custom-plan-123'
    });
    
    // Act
    const result = await subscriptionService.validateUserLimit(organizationId, requestedUserCount);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.message).toContain('limit of 15 users');
    expect(result.currentLimit).toBe(15);
    expect(result.requestedCount).toBe(16);
  });
});
```

### Integration Tests

1. End-to-end custom plan creation flow
2. User limit enforcement testing
3. Billing cycle verification
4. Upgrade/downgrade scenarios

### Performance Testing

1. Database query optimization
2. API response times
3. Billing calculation performance

## Monitoring and Analytics

### Key Metrics to Track

1. **Custom Plan Usage**
   - Number of active custom plans
   - Average discount percentage
   - Distribution by user count

2. **Financial Impact**
   - Revenue from custom plans
   - Average revenue per user
   - Comparison to standard plan revenue

3. **Operational Metrics**
   - Time to implement custom plans
   - Support ticket volume for custom plans
   - Renewal conversion rate

### Dashboards

1. **Executive Dashboard**
   - Custom plan revenue
   - Discount analysis
   - Growth trends

2. **Operations Dashboard**
   - Implementation status
   - Upcoming renewals
   - User limit utilization

## Security Considerations

1. **Access Control**
   - Restrict custom plan creation to authorized roles
   - Implement approval workflows
   - Audit all pricing changes

2. **Data Protection**
   - Encrypt sensitive pricing information
   - Implement field-level security for custom terms
   - Ensure proper access controls for financial data

## Deployment Strategy

1. **Database Migration**
   - Create schema update scripts
   - Plan for zero-downtime migration
   - Include rollback procedures

2. **Feature Flags**
   - Implement gradual rollout
   - Enable/disable custom plan features
   - A/B testing for UI changes

3. **Documentation**
   - Update API documentation
   - Create internal knowledge base
   - Provide training materials

## Conclusion

Implementing support for custom subscription plans requires significant changes across the database, API, service layer, and user interface. By following this technical implementation guide, the system can be enhanced to support flexible pricing arrangements while maintaining data integrity, security, and operational efficiency.

The phased approach allows for incremental deployment and testing, minimizing risk while providing early value to the business and clients.