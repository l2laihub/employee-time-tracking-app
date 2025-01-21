# Common Issues and Solutions

This guide covers common issues that you might encounter while using or developing ClockFlow, along with their solutions.

## Development Issues

### 1. Build Failures

#### Issue: TypeScript Compilation Errors
```
TS2307: Cannot find module '@/components/...' or its corresponding type declarations.
```

**Solution**:
1. Check `tsconfig.json` paths:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
2. Verify import path is correct
3. Run `npm install` to update dependencies

#### Issue: Vite Build Errors
```
Error: Failed to resolve import "..."
```

**Solution**:
1. Clear vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```
2. Rebuild:
   ```bash
   npm run build
   ```

### 2. Runtime Errors

#### Issue: React Hook Errors
```
React Hook "useEffect" is called conditionally...
```

**Solution**:
```typescript
// Incorrect
if (condition) {
  useEffect(() => {}, []);
}

// Correct
useEffect(() => {
  if (condition) {
    // effect code
  }
}, [condition]);
```

#### Issue: State Update on Unmounted Component
```
Warning: Can't perform a React state update on an unmounted component
```

**Solution**:
```typescript
function Component() {
  const [data, setData] = useState(null);
  const mounted = useRef(true);
  
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);
  
  const fetchData = async () => {
    const result = await api.getData();
    if (mounted.current) {
      setData(result);
    }
  };
}
```

## Authentication Issues

### 1. Login Problems

#### Issue: Invalid Login Credentials
```
Error: Invalid login credentials
```

**Solution**:
1. Check email format
2. Verify password meets requirements:
   ```typescript
   const passwordRequirements = {
     minLength: 8,
     requireUppercase: true,
     requireLowercase: true,
     requireNumbers: true,
     requireSpecialChars: true
   };
   ```
3. Reset password if needed

#### Issue: Session Expired
```
Error: JWT has expired
```

**Solution**:
```typescript
// Implement auto refresh
function useTokenRefresh() {
  useEffect(() => {
    const refreshToken = async () => {
      try {
        await supabase.auth.refreshSession();
      } catch (error) {
        // Handle error
      }
    };
    
    const interval = setInterval(refreshToken, 45 * 60 * 1000); // 45 minutes
    return () => clearInterval(interval);
  }, []);
}
```

## Database Issues

### 1. Connection Problems

#### Issue: Database Connection Failed
```
Error: Unable to connect to database
```

**Solution**:
1. Check environment variables:
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```
2. Verify Supabase project status
3. Check network connectivity

#### Issue: RLS Policy Blocking Access
```
Error: new row violates row-level security policy
```

**Solution**:
1. Check RLS policies:
   ```sql
   -- List policies
   SELECT * FROM pg_policies;
   
   -- Verify user has correct role
   SELECT * FROM auth.users WHERE id = 'user_id';
   ```
2. Update policies if needed:
   ```sql
   ALTER POLICY "policy_name" ON table_name
   USING (auth.uid() = user_id);
   ```

## Performance Issues

### 1. Slow Loading

#### Issue: Slow Initial Load
**Solution**:
1. Implement code splitting:
   ```typescript
   const TimeSheet = lazy(() => import('./TimeSheet'));
   ```

2. Optimize bundle size:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             components: ['@/components']
           }
         }
       }
     }
   });
   ```

#### Issue: Slow Data Loading
**Solution**:
1. Implement caching:
   ```typescript
   const { data } = useQuery(['key', params], fetchData, {
     staleTime: 5 * 60 * 1000, // 5 minutes
     cacheTime: 30 * 60 * 1000 // 30 minutes
   });
   ```

2. Optimize queries:
   ```sql
   -- Add indexes
   CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, start_time);
   
   -- Use materialized views for reports
   CREATE MATERIALIZED VIEW report_summary AS
   SELECT /* complex query */;
   ```

## UI/UX Issues

### 1. Layout Problems

#### Issue: Responsive Design Issues
**Solution**:
```typescript
// Use Tailwind breakpoints
const Component = () => (
  <div className="
    w-full
    md:w-1/2
    lg:w-1/3
    p-4
    md:p-6
    lg:p-8
  ">
    Content
  </div>
);
```

#### Issue: Form Validation Errors
**Solution**:
```typescript
// Use React Hook Form with Zod
const schema = z.object({
  email: z.string().email(),
  hours: z.number().min(0).max(24)
});

function Form() {
  const form = useForm({
    resolver: zodResolver(schema)
  });
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('email')} />
      {form.formState.errors.email && (
        <span>Invalid email</span>
      )}
    </form>
  );
}
```

## Time Tracking Issues

### 1. Time Entry Problems

#### Issue: Overlapping Time Entries
**Solution**:
```typescript
function checkOverlap(newEntry: TimeEntry, existingEntries: TimeEntry[]) {
  return existingEntries.some(entry => 
    (newEntry.startTime >= entry.startTime && 
     newEntry.startTime < entry.endTime) ||
    (newEntry.endTime > entry.startTime && 
     newEntry.endTime <= entry.endTime)
  );
}

// Prevent overlapping entries
async function createTimeEntry(entry: TimeEntry) {
  const existing = await getExistingEntries(entry.userId, entry.date);
  if (checkOverlap(entry, existing)) {
    throw new Error('Time entry overlaps with existing entry');
  }
  return saveTimeEntry(entry);
}
```

#### Issue: Incorrect Time Calculations
**Solution**:
```typescript
function calculateDuration(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Round to 2 decimals
}

function adjustForTimezone(date: Date): Date {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset);
}
```

## PTO Management Issues

### 1. Balance Calculation

#### Issue: Incorrect PTO Balance
**Solution**:
```typescript
async function recalculatePTOBalance(userId: string) {
  // Get all approved PTO requests
  const requests = await getPTORequests(userId, 'approved');
  
  // Calculate used hours
  const usedHours = requests.reduce((total, request) => {
    return total + calculatePTOHours(request.startDate, request.endDate);
  }, 0);
  
  // Calculate accrued hours
  const accrualRate = await getAccrualRate(userId);
  const employmentDuration = await getEmploymentDuration(userId);
  const accruedHours = calculateAccruedHours(
    accrualRate,
    employmentDuration
  );
  
  // Update balance
  return updatePTOBalance(userId, accruedHours - usedHours);
}
```

## Reporting Issues

### 1. Report Generation

#### Issue: Timeout on Large Reports
**Solution**:
```typescript
async function generateLargeReport(params: ReportParams) {
  // Use pagination
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  const results = [];
  
  while (hasMore) {
    const data = await fetchReportPage(params, page, pageSize);
    results.push(...data);
    hasMore = data.length === pageSize;
    page++;
  }
  
  return processResults(results);
}

// Or use streaming for real-time updates
async function* streamReport(params: ReportParams) {
  let cursor = null;
  
  while (true) {
    const { data, nextCursor } = await fetchReportBatch(
      params,
      cursor
    );
    
    if (!data.length) break;
    
    yield data;
    cursor = nextCursor;
  }
}
```

## Deployment Issues

### 1. Build and Deploy

#### Issue: Failed Deployment
**Solution**:
1. Check build logs
2. Verify environment variables
3. Test locally first:
   ```bash
   # Build locally
   npm run build
   
   # Serve production build
   npm run preview
   
   # Check for errors
   npm run lint
   npm run test
   ```

#### Issue: Database Migration Failures
**Solution**:
```bash
# Backup database first
pg_dump $DATABASE_URL > backup.sql

# Run migrations with rollback plan
npm run migration:up || npm run migration:down

# Verify migration
npm run migration:status

# Test critical paths
npm run test:e2e
```

## Getting Help

If you encounter an issue not covered here:

1. Check the error logs:
   ```bash
   # Application logs
   tail -f app.log
   
   # Database logs
   tail -f postgresql.log
   ```

2. Search existing GitHub issues

3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant code snippets

4. Contact support:
   - Email: support@clockflow.com
   - Slack: #clockflow-support
