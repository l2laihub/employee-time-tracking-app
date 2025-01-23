# Supabase Integration Plan

This document outlines the implementation plan for integrating ClockFlow with Supabase for data storage, authentication, and real-time features with multi-tenant support.

## 1. Project Setup

### 1.1 Supabase Project Creation
1. Create new Supabase project
2. Save project credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### 1.2 Client Setup
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Organization-aware client wrapper
export class OrganizationClient {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // Automatically inject organization_id in queries
  from(table: string) {
    return supabase
      .from(table)
      .select()
      .eq('organization_id', this.organizationId);
  }

  // Organization-specific real-time subscriptions
  subscribe(table: string, callback: (payload: any) => void) {
    return supabase
      .from(table)
      .on('*', payload => {
        if (payload.new.organization_id === this.organizationId) {
          callback(payload);
        }
      })
      .subscribe();
  }
}
```

## 2. Database Schema

### 2.1 Core Tables

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'basic',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Users and Authentication
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  department TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  break_duration INTEGER DEFAULT 0,
  job_location_id UUID REFERENCES job_locations,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Locations
CREATE TABLE job_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PTO Requests
CREATE TABLE pto_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timesheets
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  total_hours NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scope TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Organization Metrics
CREATE TABLE organization_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  active_users INTEGER DEFAULT 0,
  time_entries INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Row Level Security (RLS)

```sql
-- Organizations RLS
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

CREATE POLICY "Only admins can update organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Time Entries RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
```

## 3. Implementation Phases

### Phase 1: Authentication & Organization Setup
1. **Organization Creation**
   ```typescript
   async function createOrganization(data: OrganizationData) {
     const { organization, error } = await supabase
       .from('organizations')
       .insert({
         name: data.name,
         slug: generateSlug(data.name),
         plan_type: 'trial',
         subscription_status: 'active'
       })
       .select()
       .single();

     if (error) throw error;

     // Add creator as admin
     await supabase
       .from('organization_members')
       .insert({
         organization_id: organization.id,
         user_id: auth.user()?.id,
         role: 'admin'
       });

     return organization;
   }
   ```

2. **User Invitation**
   ```typescript
   async function inviteUser(email: string, role: string) {
     // Generate invite
     const { data: invite } = await supabase
       .from('invites')
       .insert({
         email,
         organization_id: currentOrganization.id,
         role,
         invited_by: auth.user()?.id
       })
       .select()
       .single();

     // Send invitation email
     await sendInviteEmail(invite);
   }
   ```

### Phase 2: Organization Context
```typescript
// src/contexts/OrganizationContext.tsx
export function OrganizationProvider({ children }: Props) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Get user's organization
      const { data } = await supabase
        .from('organization_members')
        .select('organizations (*)')
        .eq('user_id', user.id)
        .single();

      setOrganization(data?.organizations);
    }
  }, [user]);

  return (
    <OrganizationContext.Provider value={{ organization }}>
      {children}
    </OrganizationContext.Provider>
  );
}
```

### Phase 3: Feature Management
```typescript
// src/hooks/useOrganizationFeature.ts
export function useOrganizationFeature(featureKey: string) {
  const { organization } = useOrganization();
  
  const isEnabled = useMemo(() => {
    const plan = PLAN_FEATURES[organization?.plan_type];
    return plan?.features.includes(featureKey) ?? false;
  }, [organization, featureKey]);

  return isEnabled;
}
```

### Phase 4: Data Migration
```typescript
async function migrateToMultiTenant() {
  // Get all existing data
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('*');

  // Create default organization
  const { data: organization } = await createOrganization({
    name: 'Default Organization',
    plan_type: 'enterprise'
  });

  // Update all records with organization_id
  for (const table of TABLES_TO_MIGRATE) {
    await supabase
      .from(table)
      .update({ organization_id: organization.id })
      .is('organization_id', null);
  }
}
```

## 4. Testing Strategy

### 4.1 Multi-tenant Tests
```typescript
describe('Organization Isolation', () => {
  it('should only access organization data', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();

    const client1 = new OrganizationClient(org1.id);
    const client2 = new OrganizationClient(org2.id);

    // Create data in org1
    await client1.from('time_entries').insert(mockEntry);

    // Verify org2 cannot access org1's data
    const { data } = await client2.from('time_entries').select('*');
    expect(data).toHaveLength(0);
  });
});
```

## 5. Security Considerations

### 5.1 Data Isolation
```typescript
// src/middleware/organizationContext.ts
export async function withOrganization(req: Request, res: Response) {
  const organizationId = req.headers['x-organization-id'];
  
  if (!organizationId) {
    return res.status(400).json({
      error: 'Organization ID required'
    });
  }

  // Verify user belongs to organization
  const { data } = await supabase
    .from('organization_members')
    .select()
    .eq('organization_id', organizationId)
    .eq('user_id', req.user.id)
    .single();

  if (!data) {
    return res.status(403).json({
      error: 'Not a member of this organization'
    });
  }

  req.organizationId = organizationId;
  next();
}
```

## 6. Monitoring Setup

### 6.1 Usage Tracking
```typescript
// src/services/usage.ts
export async function trackOrganizationUsage(
  organizationId: string,
  metric: string,
  value: number
) {
  await supabase
    .from('organization_metrics')
    .insert({
      organization_id: organizationId,
      metric,
      value,
      timestamp: new Date()
    });
}
```

## 7. Success Metrics

- Multi-tenant data isolation verification
- Cross-organization access attempts: 0
- Organization creation success rate: > 99%
- User invitation acceptance rate: > 80%
- Feature access control effectiveness: 100%
- Data migration success rate: 100%

## 8. Implementation Phases

### Phase 1: Core Multi-tenancy (Week 1-2)
1. Set up Supabase project
2. Create organization tables and RLS policies
3. Implement organization context and client wrapper
4. Update authentication flow

### Phase 2: Data Migration (Week 3)
1. Create migration scripts
2. Test data migration
3. Plan production migration
4. Execute migration with minimal downtime

### Phase 3: Feature Implementation (Week 4-6)
1. Organization management
2. Member invitations
3. Role-based access
4. Real-time features

### Phase 4: Enterprise Features (Week 7-8)
1. API key management
2. Usage tracking
3. Custom domain support
4. Advanced security features

## 12. Rollout Plan

### Phase 1: Development Environment (Week 1)

1. **Initial Setup**
   ```bash
   # Create new Supabase project for development
   supabase init
   supabase start

   # Set up environment variables
   cp .env.example .env.local
   # Add Supabase credentials to .env.local
   ```

2. **Database Schema Migration**
   ```bash
   # Create migration files
   supabase migration new init_schema

   # Apply migrations
   supabase db reset
   ```

3. **Local Development Testing**
   - Set up test data
   - Verify RLS policies
   - Test real-time subscriptions

### Phase 2: Staging Environment (Week 2)

1. **Staging Environment Setup**
   ```bash
   # Create staging Supabase project
   # Configure staging environment
   cp .env.example .env.staging
   # Add staging credentials
   ```

2. **Data Migration Testing**
   ```typescript
   // scripts/test-migration.ts
   async function testMigration() {
     // 1. Export sample production data
     const sampleData = await exportSampleData();
     
     // 2. Run migration on staging
     await migrateData(sampleData);
     
     // 3. Verify data integrity
     await verifyDataIntegrity();
     
     // 4. Performance testing
     await runPerformanceTests();
   }
   ```

3. **Integration Testing**
   - End-to-end testing
   - Load testing
   - Security testing

### Phase 3: Production Preparation (Week 3)

1. **Production Environment Setup**
   ```bash
   # Create production Supabase project
   # Configure production environment
   cp .env.example .env.production
   # Add production credentials
   ```

2. **Backup Strategy**
   ```sql
   -- Create backup of existing data
   CREATE EXTENSION IF NOT EXISTS pg_dump;
   SELECT pg_dump_all();
   ```

3. **Rollback Plan**
   ```typescript
   // scripts/rollback.ts
   async function rollback() {
     // 1. Stop application
     await stopApplication();
     
     // 2. Restore database backup
     await restoreBackup();
     
     // 3. Revert code changes
     await revertCodeChanges();
     
     // 4. Restart application
     await startApplication();
   }
   ```

4. **Monitoring Setup**
   ```typescript
   // src/monitoring/supabase.ts
   export function setupMonitoring() {
     // 1. Set up error tracking
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       integrations: [
         new Sentry.Integrations.Postgres()
       ]
     });
     
     // 2. Set up performance monitoring
     setupAPM({
       serviceName: 'clockflow',
       environment: process.env.NODE_ENV
     });
     
     // 3. Set up alerts
     setupAlerts([
       {
         name: 'High Latency',
         threshold: 1000, // ms
         action: notifyTeam
       },
       {
         name: 'Error Rate',
         threshold: 0.01, // 1%
         action: notifyTeam
       }
     ]);
   }
   ```

### Phase 4: Production Deployment (Week 4)

1. **Pre-deployment Checklist**
   ```markdown
   - [ ] All staging tests passing
   - [ ] Backup strategy verified
   - [ ] Rollback plan tested
   - [ ] Monitoring tools configured
   - [ ] Team trained on new system
   - [ ] Documentation updated
   ```

2. **Deployment Steps**
   ```bash
   # 1. Create maintenance window
   # 2. Take backup
   pg_dump -Fc > pre_migration_backup.dump

   # 3. Run migrations
   supabase db reset --prod

   # 4. Deploy new application version
   npm run deploy:prod

   # 5. Verify deployment
   npm run verify:deployment
   ```

3. **Post-deployment Verification**
   ```typescript
   // scripts/verify-deployment.ts
   async function verifyDeployment() {
     // 1. Check database connectivity
     await checkDatabaseConnection();
     
     // 2. Verify data migration
     await verifyDataMigration();
     
     // 3. Test critical paths
     await testCriticalPaths();
     
     // 4. Monitor error rates
     await monitorErrorRates(30); // minutes
   }
   ```

### Phase 5: Post-deployment (Week 5)

1. **Monitoring and Optimization**
   ```typescript
   // src/monitoring/performance.ts
   export async function optimizePerformance() {
     // 1. Identify slow queries
     const slowQueries = await analyzeQueryPerformance();
     
     // 2. Optimize indexes
     await optimizeIndexes(slowQueries);
     
     // 3. Adjust caching strategy
     await optimizeCaching();
   }
   ```

2. **User Support**
   ```typescript
   // src/support/migration.ts
   export function setupSupportSystem() {
     // 1. Set up help desk
     setupHelpDesk({
       category: 'Database Migration',
       priority: 'high'
     });
     
     // 2. Create user guides
     createUserGuides();
     
     // 3. Train support team
     trainSupportTeam();
   }
   ```

3. **Cleanup**
   ```sql
   -- Remove temporary migration tables
   DROP TABLE IF EXISTS temp_migration_data;
   
   -- Remove old unused indexes
   DROP INDEX IF EXISTS old_index_name;
   ```

### Rollback Triggers

1. **Performance Issues**
   - Query latency > 1000ms
   - Error rate > 1%
   - Connection pool exhaustion

2. **Data Issues**
   - Data inconsistency detected
   - Failed migrations
   - Data loss reported

3. **Security Issues**
   - RLS policy failures
   - Unauthorized access detected
   - Data leakage

### Communication Plan

1. **Internal Communication**
   ```markdown
   - Daily standup updates
   - Migration progress reports
   - Incident response channel
   ```

2. **User Communication**
   ```markdown
   - Maintenance window notification
   - Progress updates
   - Post-migration support
   ```

3. **Stakeholder Updates**
   ```markdown
   - Weekly status reports
   - Performance metrics
   - ROI analysis
   ```

### Success Criteria

1. **Technical Metrics**
   - Zero data loss
   - Downtime < 30 minutes
   - Query performance within 10% of baseline
   - Error rate < 0.1%

2. **User Impact**
   - No major user-reported issues
   - Support ticket volume within normal range
   - User satisfaction maintained

3. **Business Metrics**
   - All critical business functions operational
   - No revenue impact
   - Improved system scalability verified

### Contingency Plans

1. **Technical Issues**
   ```typescript
   // scripts/contingency.ts
   export async function handleTechnicalIssue(
     issue: TechnicalIssue
   ) {
     switch (issue.type) {
       case 'performance':
         await scaleResources();
         break;
       case 'data':
         await restoreFromBackup();
         break;
       case 'security':
         await lockdownSystem();
         break;
     }
   }
   ```

2. **Resource Constraints**
   ```typescript
   // scripts/resource-management.ts
   export async function handleResourceConstraint(
     constraint: ResourceConstraint
   ) {
     switch (constraint.type) {
       case 'database':
         await scaleDatabaseResources();
         break;
       case 'memory':
         await optimizeMemoryUsage();
         break;
       case 'cpu':
         await adjustComputeResources();
         break;
     }
   }
   ```

3. **Support Escalation**
   ```typescript
   // src/support/escalation.ts
   export async function escalateIssue(
     issue: SupportIssue
   ) {
     // 1. Notify relevant team
     await notifyTeam(issue);
     
     // 2. Create incident report
     await createIncidentReport(issue);
     
     // 3. Track resolution
     await trackResolution(issue);
   }
   ```
