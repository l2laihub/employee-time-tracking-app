# Dashboard

The Dashboard is the central hub of ClockFlow, providing real-time insights and quick access to key features.

## Overview

The dashboard offers a comprehensive view of:
- Active employees and their current status
- Recent time entries
- Pending approvals
- Key metrics and analytics
- Quick action buttons

## Features

### 1. Real-Time Status

```typescript
interface EmployeeStatus {
  userId: string;
  status: 'active' | 'break' | 'offline';
  currentLocation?: string;
  lastActivity: Date;
  totalHoursToday: number;
}
```

- Live employee status tracking
- Current location display
- Working hours summary
- Break status indicators

### 2. Quick Actions

Available actions:
- Clock In/Out
- Start/End Break
- Submit Timesheet
- Request PTO
- View Reports

### 3. Notifications

Types of notifications:
- Pending approvals
- Timesheet deadlines
- PTO requests
- System announcements
- Important updates

### 4. Metrics Display

Key metrics shown:
- Total hours worked (daily/weekly)
- Overtime hours
- PTO balance
- Upcoming time off
- Department statistics

### 5. Recent Activity

Displays recent:
- Time entries
- Location changes
- Status updates
- System activities
- Team events

## Customization

Users can customize their dashboard:
- Widget arrangement
- Metric preferences
- Notification settings
- Display options
- Quick action buttons

## Technical Implementation

### 1. Real-Time Updates

```typescript
function useDashboardData() {
  const { data, error } = useSubscription('dashboard_updates', {
    userId: currentUser.id,
    departmentId: currentUser.departmentId
  });

  return {
    activeEmployees: data?.activeEmployees || [],
    recentActivities: data?.recentActivities || [],
    metrics: data?.metrics || defaultMetrics,
    error
  };
}
```

### 2. Metrics Calculation

```typescript
async function calculateDashboardMetrics(userId: string) {
  const today = new Date();
  const weekStart = startOfWeek(today);

  const [dailyHours, weeklyHours, ptoBalance] = await Promise.all([
    calculateDailyHours(userId, today),
    calculateWeeklyHours(userId, weekStart),
    getPTOBalance(userId)
  ]);

  return {
    dailyHours,
    weeklyHours,
    ptoBalance,
    overtime: calculateOvertime(weeklyHours)
  };
}
```

### 3. Activity Tracking

```typescript
function trackActivity(activity: Activity) {
  return supabase
    .from('activities')
    .insert({
      userId: activity.userId,
      type: activity.type,
      details: activity.details,
      timestamp: new Date()
    });
}
```

## User Interface

### 1. Layout

```tsx
function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">
        <StatusBoard />
        <RecentActivity />
      </div>
      <div className="col-span-4">
        <QuickActions />
        <Notifications />
        <Metrics />
      </div>
    </div>
  );
}
```

### 2. Responsive Design

```tsx
function StatusBoard() {
  return (
    <div className="
      grid
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-3
      gap-4
    ">
      {employees.map(employee => (
        <EmployeeCard key={employee.id} {...employee} />
      ))}
    </div>
  );
}
```

## Performance Optimization

### 1. Data Caching

```typescript
const { data } = useQuery(['dashboard', userId], fetchDashboardData, {
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
  refetchOnWindowFocus: true
});
```

### 2. Lazy Loading

```typescript
const Metrics = lazy(() => import('./Metrics'));
const RecentActivity = lazy(() => import('./RecentActivity'));
```

## Security

### 1. Access Control

```typescript
function DashboardGuard({ children }: Props) {
  const { user } = useAuth();
  const canViewDashboard = hasPermission(user, 'view:dashboard');

  if (!canViewDashboard) {
    return <AccessDenied />;
  }

  return children;
}
```

### 2. Data Filtering

```typescript
function getFilteredDashboardData(userId: string, role: string) {
  const query = supabase
    .from('dashboard_data')
    .select('*');

  if (role !== 'admin') {
    query.eq('department_id', getUserDepartment(userId));
  }

  return query;
}
```

## Error Handling

```typescript
function DashboardErrorBoundary() {
  return (
    <ErrorBoundary
      fallback={<DashboardError />}
      onError={(error) => {
        logError('Dashboard Error', error);
        showErrorNotification('Failed to load dashboard');
      }}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

## Customization API

```typescript
interface DashboardConfig {
  layout: 'grid' | 'list';
  refreshInterval: number;
  showMetrics: boolean;
  enableNotifications: boolean;
  quickActions: string[];
}

function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(defaultConfig);

  const updateConfig = async (newConfig: Partial<DashboardConfig>) => {
    const updated = { ...config, ...newConfig };
    await saveDashboardConfig(updated);
    setConfig(updated);
  };

  return { config, updateConfig };
}
```
