# Authentication & Authorization

This document outlines the authentication and authorization implementation in ClockFlow.

## Authentication

### Authentication Flow

1. **User Login**
   ```typescript
   async function login(email: string, password: string) {
     try {
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       
       if (error) throw error;
       
       return data;
     } catch (error) {
       handleAuthError(error);
     }
   }
   ```

2. **Token Management**
   ```typescript
   // src/services/auth.ts
   export const authService = {
     getToken: () => localStorage.getItem('access_token'),
     
     setToken: (token: string) => {
       localStorage.setItem('access_token', token);
     },
     
     removeToken: () => {
       localStorage.removeItem('access_token');
     },
     
     refreshToken: async () => {
       const { data, error } = await supabase.auth.refreshSession();
       if (error) throw error;
       return data;
     }
   };
   ```

3. **Protected Routes**
   ```typescript
   // src/components/ProtectedRoute.tsx
   export function ProtectedRoute({ children, requiredRole }: Props) {
     const { user, loading } = useAuth();
     const navigate = useNavigate();
     
     useEffect(() => {
       if (!loading && !user) {
         navigate('/login');
       }
       
       if (user && requiredRole && !hasRole(user, requiredRole)) {
         navigate('/unauthorized');
       }
     }, [user, loading, requiredRole]);
     
     if (loading) return <LoadingSpinner />;
     
     return children;
   }
   ```

## Authorization

### Role-Based Access Control (RBAC)

1. **User Roles**
   ```typescript
   export enum UserRole {
     ADMIN = 'admin',
     MANAGER = 'manager',
     EMPLOYEE = 'employee'
   }
   
   interface User {
     id: string;
     email: string;
     role: UserRole;
     permissions: string[];
   }
   ```

2. **Permission Checks**
   ```typescript
   // src/utils/permissions.ts
   export const Permissions = {
     VIEW_REPORTS: 'view:reports',
     MANAGE_USERS: 'manage:users',
     APPROVE_TIME: 'approve:time',
     MANAGE_PTO: 'manage:pto'
   } as const;
   
   export function hasPermission(user: User, permission: string): boolean {
     return user.permissions.includes(permission);
   }
   
   export function hasRole(user: User, role: UserRole): boolean {
     return user.role === role;
   }
   ```

3. **Role-Based Components**
   ```typescript
   // src/components/RoleGuard.tsx
   export function RoleGuard({ 
     children, 
     requiredRole, 
     fallback = null 
   }: Props) {
     const { user } = useAuth();
     
     if (!user || !hasRole(user, requiredRole)) {
       return fallback;
     }
     
     return children;
   }
   ```

### Database Security

1. **Row Level Security (RLS)**
   ```sql
   -- Enable RLS
   ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
   
   -- Policies
   CREATE POLICY "Users can view own entries"
   ON time_entries FOR SELECT
   USING (auth.uid() = user_id);
   
   CREATE POLICY "Managers can view department entries"
   ON time_entries FOR SELECT
   USING (
     auth.uid() IN (
       SELECT manager_id 
       FROM departments 
       WHERE id = (
         SELECT department_id 
         FROM users 
         WHERE id = time_entries.user_id
       )
     )
   );
   ```

2. **Function Security**
   ```sql
   -- Secure function execution
   CREATE FUNCTION get_user_report(user_id UUID)
   RETURNS TABLE (
     date DATE,
     hours NUMERIC
   )
   SECURITY DEFINER
   SET search_path = public
   LANGUAGE plpgsql
   AS $$
   BEGIN
     -- Check permissions
     IF NOT has_permission(auth.uid(), 'view:reports') THEN
       RAISE EXCEPTION 'Insufficient permissions';
     END IF;
     
     RETURN QUERY
     SELECT 
       date_trunc('day', start_time)::DATE,
       SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600)
     FROM time_entries
     WHERE user_id = $1
     GROUP BY 1;
   END;
   $$;
   ```

## Security Best Practices

### Password Security

1. **Password Requirements**
   ```typescript
   // src/utils/validation.ts
   export const passwordSchema = z.string()
     .min(8, 'Password must be at least 8 characters')
     .regex(/[A-Z]/, 'Must contain uppercase letter')
     .regex(/[a-z]/, 'Must contain lowercase letter')
     .regex(/[0-9]/, 'Must contain number')
     .regex(/[^A-Za-z0-9]/, 'Must contain special character');
   ```

2. **Password Reset**
   ```typescript
   async function resetPassword(email: string) {
     const { error } = await supabase.auth.resetPasswordForEmail(
       email,
       {
         redirectTo: 'https://example.com/reset-password',
       }
     );
     
     if (error) throw error;
   }
   ```

### Session Management

1. **Session Timeout**
   ```typescript
   // src/hooks/useSessionTimeout.ts
   export function useSessionTimeout() {
     const { signOut } = useAuth();
     const lastActivity = useRef(Date.now());
     
     useEffect(() => {
       const timeout = setTimeout(() => {
         const inactiveTime = Date.now() - lastActivity.current;
         if (inactiveTime > SESSION_TIMEOUT) {
           signOut();
         }
       }, CHECK_INTERVAL);
       
       return () => clearTimeout(timeout);
     }, []);
     
     const updateActivity = () => {
       lastActivity.current = Date.now();
     };
     
     useEffect(() => {
       window.addEventListener('mousemove', updateActivity);
       window.addEventListener('keypress', updateActivity);
       
       return () => {
         window.removeEventListener('mousemove', updateActivity);
         window.removeEventListener('keypress', updateActivity);
       };
     }, []);
   }
   ```

2. **Token Refresh**
   ```typescript
   // src/hooks/useTokenRefresh.ts
   export function useTokenRefresh() {
     const { refreshToken } = useAuth();
     
     useEffect(() => {
       const refresh = async () => {
         try {
           await refreshToken();
         } catch (error) {
           console.error('Token refresh failed:', error);
         }
       };
       
       const interval = setInterval(refresh, REFRESH_INTERVAL);
       
       return () => clearInterval(interval);
     }, []);
   }
   ```

### API Security

1. **Request Authentication**
   ```typescript
   // src/services/api.ts
   const api = axios.create({
     baseURL: process.env.VITE_API_URL,
     headers: {
       'Content-Type': 'application/json',
     },
   });
   
   api.interceptors.request.use((config) => {
     const token = authService.getToken();
     
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     
     return config;
   });
   ```

2. **Error Handling**
   ```typescript
   api.interceptors.response.use(
     (response) => response,
     (error) => {
       if (error.response?.status === 401) {
         authService.removeToken();
         window.location.href = '/login';
       }
       
       return Promise.reject(error);
     }
   );
   ```

### CSRF Protection

1. **CSRF Token**
   ```typescript
   // src/utils/csrf.ts
   export function getCsrfToken(): string {
     return document
       .querySelector('meta[name="csrf-token"]')
       ?.getAttribute('content') ?? '';
   }
   
   api.interceptors.request.use((config) => {
     config.headers['X-CSRF-Token'] = getCsrfToken();
     return config;
   });
   ```

### XSS Prevention

1. **Content Security Policy**
   ```typescript
   // src/index.html
   <meta http-equiv="Content-Security-Policy" 
     content="default-src 'self'; 
              script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
              style-src 'self' 'unsafe-inline';">
   ```

2. **Input Sanitization**
   ```typescript
   // src/utils/sanitize.ts
   import DOMPurify from 'dompurify';
   
   export function sanitizeHtml(dirty: string): string {
     return DOMPurify.sanitize(dirty, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
       ALLOWED_ATTR: ['href']
     });
   }
   ```

## Security Monitoring

1. **Audit Logging**
   ```typescript
   // src/utils/audit.ts
   export function logAuditEvent(
     action: string,
     userId: string,
     details: object
   ) {
     const event = {
       timestamp: new Date().toISOString(),
       action,
       userId,
       details,
       userAgent: navigator.userAgent,
       ip: request.ip // from server context
     };
     
     return supabase
       .from('audit_logs')
       .insert(event);
   }
   ```

2. **Error Tracking**
   ```typescript
   // src/utils/error.ts
   export function logError(
     error: Error,
     context: object = {}
   ) {
     const errorEvent = {
       timestamp: new Date().toISOString(),
       error: {
         name: error.name,
         message: error.message,
         stack: error.stack
       },
       context,
       environment: process.env.NODE_ENV
     };
     
     // Send to error tracking service
     Sentry.captureException(error, {
       extra: context
     });
   }
   ```
