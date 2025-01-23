# Scaling Architecture for ClockFlow

This document outlines the architectural changes needed to scale ClockFlow from a single-client solution to a multi-tenant SaaS platform.

## 1. Multi-Tenancy Architecture

### 1.1 Database Schema Changes

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Modified Profiles Table
ALTER TABLE profiles
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Modified Time Entries Table
ALTER TABLE time_entries
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Add organization_id to all relevant tables
ALTER TABLE job_locations ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE pto_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE timesheets ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

### 1.2 Row Level Security Updates

```sql
-- Organization RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Time Entries RLS with Organization
CREATE POLICY "Users can view organization time entries"
  ON time_entries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
    OR user_id = auth.uid()
  );
```

## 2. Subscription and Billing Integration

### 2.1 Stripe Integration

```typescript
// src/services/billing.ts
interface SubscriptionTier {
  id: string;
  name: string;
  features: string[];
  limits: {
    users: number;
    storage: number;
    locations: number;
  };
  price: {
    monthly: number;
    yearly: number;
  };
}

export async function createSubscription(
  organizationId: string,
  tier: SubscriptionTier,
  paymentMethod: string
) {
  // Create Stripe customer
  const customer = await stripe.customers.create({
    metadata: { organizationId }
  });
  
  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: tier.id }],
    payment_method: paymentMethod,
    expand: ['latest_invoice.payment_intent']
  });
  
  // Update organization
  await supabase
    .from('organizations')
    .update({
      subscription_status: 'active',
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id
    })
    .eq('id', organizationId);
    
  return subscription;
}
```

## 3. Feature Isolation and Customization

### 3.1 Organization Settings Schema

```typescript
interface OrganizationSettings {
  features: {
    timeTracking: {
      enabled: boolean;
      requireLocation: boolean;
      overtimeRules: {
        enabled: boolean;
        threshold: number;
        rate: number;
      };
    };
    pto: {
      enabled: boolean;
      types: string[];
      accrualRules: Record<string, AccrualRule>;
    };
    reporting: {
      enabled: boolean;
      customReports: boolean;
      exportFormats: string[];
    };
  };
  branding: {
    logo: string;
    colors: {
      primary: string;
      secondary: string;
    };
    customDomain?: string;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    webhooks: WebhookConfig[];
  };
}
```

### 3.2 Feature Flag System

```typescript
// src/hooks/useFeatureFlag.ts
export function useFeatureFlag(
  feature: string,
  organizationId: string
) {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    const checkFeature = async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();
        
      setEnabled(
        get(org?.settings, `features.${feature}.enabled`, false)
      );
    };
    
    checkFeature();
  }, [feature, organizationId]);
  
  return enabled;
}
```

## 4. Scalable Architecture Components

### 4.1 Caching Strategy

```typescript
// src/lib/cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheData(
  key: string,
  data: any,
  ttl: number = 3600
) {
  await redis.set(
    `clockflow:${key}`,
    JSON.stringify(data),
    'EX',
    ttl
  );
}

export async function getCachedData(key: string) {
  const data = await redis.get(`clockflow:${key}`);
  return data ? JSON.parse(data) : null;
}
```

### 4.2 Background Jobs

```typescript
// src/workers/index.ts
import Bull from 'bull';

// Report generation queue
export const reportQueue = new Bull('reports', {
  redis: process.env.REDIS_URL
});

// Data export queue
export const exportQueue = new Bull('exports', {
  redis: process.env.REDIS_URL
});

// Notification queue
export const notificationQueue = new Bull('notifications', {
  redis: process.env.REDIS_URL
});
```

## 5. API Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const apiLimiter = rateLimit({
  store: new RedisStore({
    redis: redis,
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    const org = await getOrganization(req);
    return org.plan_type === 'enterprise' ? 1000 : 100;
  }
});
```

## 6. Analytics and Monitoring

### 6.1 Usage Tracking

```typescript
// src/services/analytics.ts
interface UsageMetrics {
  activeUsers: number;
  timeEntries: number;
  storageUsed: number;
  apiCalls: number;
}

export async function trackOrganizationUsage(
  organizationId: string,
  metrics: Partial<UsageMetrics>
) {
  await supabase
    .from('organization_metrics')
    .insert({
      organization_id: organizationId,
      ...metrics,
      timestamp: new Date()
    });
}
```

### 6.2 Performance Monitoring

```typescript
// src/lib/monitoring.ts
export function setupMonitoring() {
  // APM setup
  const apm = require('elastic-apm-node').start({
    serviceName: 'clockflow',
    environment: process.env.NODE_ENV
  });
  
  // Custom metrics
  apm.addLabels({
    'tier': process.env.DEPLOYMENT_TIER,
    'region': process.env.AWS_REGION
  });
}
```

## 7. Data Isolation and Security

### 7.1 Data Export/Import

```typescript
// src/services/dataMigration.ts
export async function exportOrganizationData(
  organizationId: string
): Promise<ExportData> {
  const tables = [
    'profiles',
    'time_entries',
    'job_locations',
    'pto_requests',
    'timesheets'
  ];
  
  const data: ExportData = {};
  
  for (const table of tables) {
    const { data: tableData } = await supabase
      .from(table)
      .select('*')
      .eq('organization_id', organizationId);
      
    data[table] = tableData;
  }
  
  return data;
}
```

### 7.2 Encryption at Rest

```typescript
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv } from 'crypto';

export function encryptSensitiveData(
  data: string,
  organizationKey: string
): string {
  const cipher = createCipheriv(
    'aes-256-gcm',
    organizationKey,
    Buffer.from(process.env.ENCRYPTION_IV!, 'hex')
  );
  
  return Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]).toString('hex');
}
```

## 8. Integration Capabilities

### 8.1 Webhook System

```typescript
// src/services/webhooks.ts
interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
}

export async function triggerWebhooks(
  organizationId: string,
  event: string,
  payload: any
) {
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
    
  const webhooks = org.settings.notifications.webhooks
    .filter(w => w.events.includes(event));
    
  for (const webhook of webhooks) {
    await notificationQueue.add('webhook', {
      url: webhook.url,
      event,
      payload,
      secret: webhook.secret
    });
  }
}
```

### 8.2 API Access

```typescript
// src/services/apiKeys.ts
export async function generateApiKey(
  organizationId: string,
  scope: string[]
): Promise<string> {
  const key = generateSecureToken();
  
  await supabase
    .from('api_keys')
    .insert({
      organization_id: organizationId,
      key_hash: hashKey(key),
      scope,
      created_at: new Date()
    });
    
  return key;
}
```

## 9. Deployment Architecture

### 9.1 Multi-Region Support

```typescript
// src/config/regions.ts
export const regions = {
  'us-west': {
    database: process.env.SUPABASE_URL_US_WEST,
    storage: process.env.S3_BUCKET_US_WEST,
    cdn: process.env.CDN_URL_US_WEST
  },
  'eu-central': {
    database: process.env.SUPABASE_URL_EU_CENTRAL,
    storage: process.env.S3_BUCKET_EU_CENTRAL,
    cdn: process.env.CDN_URL_EU_CENTRAL
  }
};
```

### 9.2 Load Balancing

```typescript
// src/lib/loadBalancer.ts
export function getRegionForOrganization(
  organizationId: string
): string {
  // Determine best region based on:
  // 1. Organization preference
  // 2. User location
  // 3. Load distribution
  return determineOptimalRegion(organizationId);
}
```

## 10. Success Metrics for Scale

- **Performance Targets**
  - API Response Time: < 100ms (95th percentile)
  - Real-time Updates: < 500ms
  - Page Load Time: < 2s
  
- **Scalability Goals**
  - Support 1000+ organizations
  - Handle 100k+ daily time entries
  - Process 10k+ concurrent users
  
- **Reliability Targets**
  - 99.9% uptime
  - Zero data loss
  - < 1min recovery time

## 11. Implementation Priority

1. **Phase 1: Multi-tenancy Foundation**
   - Organization schema
   - User management
   - RLS policies

2. **Phase 2: Subscription System**
   - Stripe integration
   - Plan management
   - Usage tracking

3. **Phase 3: Scalability Features**
   - Caching
   - Background jobs
   - Rate limiting

4. **Phase 4: Enterprise Features**
   - Custom branding
   - API access
   - Advanced reporting

5. **Phase 5: Global Scale**
   - Multi-region support
   - CDN integration
   - Load balancing
