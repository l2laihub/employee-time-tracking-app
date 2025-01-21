# Database Schema

This document outlines the database schema for ClockFlow, implemented in Supabase (PostgreSQL).

## Core Tables

### users
User accounts and authentication

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### departments
Organizational departments

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### time_entries
Individual time entries

```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    job_location_id UUID REFERENCES job_locations(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    break_duration INTEGER DEFAULT 0, -- in minutes
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### job_locations
Work locations and job sites

```sql
CREATE TABLE job_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### timesheets
Weekly/monthly timesheets

```sql
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    total_hours DECIMAL NOT NULL DEFAULT 0,
    overtime_hours DECIMAL NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## PTO Management Tables

### pto_policies
PTO policy definitions

```sql
CREATE TABLE pto_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('vacation', 'sick', 'personal')),
    accrual_rate DECIMAL NOT NULL, -- hours per year
    max_balance DECIMAL, -- maximum hours that can be accrued
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### pto_balances
Employee PTO balances

```sql
CREATE TABLE pto_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    policy_id UUID REFERENCES pto_policies(id),
    balance DECIMAL NOT NULL DEFAULT 0,
    used_hours DECIMAL NOT NULL DEFAULT 0,
    last_accrual_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### pto_requests
PTO request records

```sql
CREATE TABLE pto_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    policy_id UUID REFERENCES pto_policies(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours DECIMAL NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);

-- Time Entries
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(start_time);
CREATE INDEX idx_time_entries_status ON time_entries(status);

-- Timesheets
CREATE INDEX idx_timesheets_user ON timesheets(user_id);
CREATE INDEX idx_timesheets_date_range ON timesheets(start_date, end_date);
CREATE INDEX idx_timesheets_status ON timesheets(status);

-- PTO
CREATE INDEX idx_pto_requests_user ON pto_requests(user_id);
CREATE INDEX idx_pto_requests_date_range ON pto_requests(start_date, end_date);
CREATE INDEX idx_pto_balances_user ON pto_balances(user_id, policy_id);
```

## Views

### employee_hours_summary
```sql
CREATE VIEW employee_hours_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    d.name as department,
    DATE_TRUNC('week', te.start_time) as week_start,
    SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time))/3600) as total_hours,
    COUNT(DISTINCT te.job_location_id) as locations_worked
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN time_entries te ON u.id = te.user_id
GROUP BY u.id, u.full_name, d.name, DATE_TRUNC('week', te.start_time);
```

### pto_summary
```sql
CREATE VIEW pto_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    pp.type as pto_type,
    pb.balance as current_balance,
    pb.used_hours,
    COUNT(pr.id) as pending_requests
FROM users u
JOIN pto_balances pb ON u.id = pb.user_id
JOIN pto_policies pp ON pb.policy_id = pp.id
LEFT JOIN pto_requests pr ON u.id = pr.user_id 
    AND pr.status = 'pending'
GROUP BY u.id, u.full_name, pp.type, pb.balance, pb.used_hours;
```

## Database Functions

### calculate_overtime
```sql
CREATE OR REPLACE FUNCTION calculate_overtime(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS DECIMAL AS $$
DECLARE
    total_hours DECIMAL;
    overtime_hours DECIMAL;
BEGIN
    -- Calculate total hours worked
    SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600)
    INTO total_hours
    FROM time_entries
    WHERE user_id = p_user_id
    AND start_time >= p_start_date
    AND end_time <= p_end_date;

    -- Calculate overtime (hours over 40 per week)
    overtime_hours := GREATEST(0, total_hours - 40);
    
    RETURN overtime_hours;
END;
$$ LANGUAGE plpgsql;
```

## Security Policies

```sql
-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_see_own_data ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Managers can see their department's data
CREATE POLICY managers_see_department ON users
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT manager_id 
            FROM departments 
            WHERE id = department_id
        )
    );

-- Time entries policies
CREATE POLICY time_entries_own ON time_entries
    FOR ALL
    USING (auth.uid() = user_id);

-- PTO request policies
CREATE POLICY pto_requests_own ON pto_requests
    FOR ALL
    USING (auth.uid() = user_id);
```

## Maintenance

### Backup
- Daily automated backups
- Point-in-time recovery enabled
- 30-day retention period

### Performance
- Regular VACUUM ANALYZE
- Monitor and maintain indexes
- Query performance optimization

### Data Retention
- Archived data moved to separate tables after 2 years
- Soft deletes implemented for most tables
- Audit logs retained for 7 years
