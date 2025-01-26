# API Reference

## Authentication

### Sign In

```typescript
async function signIn(
  email: string,
  password: string,
  options?: SignInOptions
): Promise<AuthResult>
```

Parameters:
- `email`: User's email address
- `password`: User's password
- `options`: Additional sign-in options

Returns:
- `AuthResult` with session and user data or error

### Sign Up

```typescript
async function signUp(
  email: string,
  password: string,
  userData: UserData,
  options?: SignUpOptions
): Promise<AuthResult>
```

Parameters:
- `email`: User's email address
- `password`: User's password
- `userData`: Additional user information
- `options`: Sign-up options

Returns:
- `AuthResult` with created user data or error

## Types

### AuthResult

```typescript
interface AuthResult {
  success: boolean;
  session?: Session;
  user?: User;
  error?: string;
  redirectTo?: string;
}
```

### Session

```typescript
interface Session {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active: string;
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in?: string;
}
```

### SignInOptions

```typescript
interface SignInOptions {
  redirectTo?: string;
  rememberMe?: boolean;
  captchaToken?: string;
}
```

## Error Handling

All API methods follow this error pattern:

```typescript
try {
  // Authentication operation
  return {
    success: true,
    session: sessionData,
    user: userData
  };
} catch (error) {
  return {
    success: false,
    error: error.message
  };
}
```

Common error types:
1. Invalid credentials
2. Account locked
3. Email not verified
4. Rate limit exceeded
5. Invalid token

## Usage Examples

### Complete Authentication Flow

```typescript
// Sign up a new user
const signUpResult = await signUp(
  "user@example.com",
  "securePassword123",
  {
    firstName: "John",
    lastName: "Doe"
  }
);

// Sign in
const signInResult = await signIn(
  "user@example.com",
  "securePassword123",
  {
    redirectTo: "/dashboard",
    rememberMe: true
  }
);

// Handle MFA if required
if (signInResult.requiresMFA) {
  const mfaResult = await verifyMFA(
    signInResult.session.id,
    "123456"
  );
}
```

### Password Management

```typescript
// Request password reset
const resetRequest = await requestPasswordReset("user@example.com");

// Complete password reset
const resetResult = await resetPassword(
  resetToken,
  "newSecurePassword123"
);

// Change password
const changeResult = await changePassword(
  userId,
  "currentPassword",
  "newPassword123"
);
```

### Session Management

```typescript
// Get current session
const session = await getCurrentSession();

// Validate session
const isValid = await validateSession(sessionToken);

// Revoke session
await revokeSession(sessionId);

// Revoke all sessions
await revokeAllSessions(userId);
```

## Database Operations

### User Creation

```sql
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_verified,
  created_at
) VALUES (
  $1,
  $2,
  false,
  now()
) RETURNING *;
```

### Session Creation

```sql
INSERT INTO auth.sessions (
  user_id,
  expires_at,
  created_at
) VALUES (
  $1,
  now() + interval '1 hour',
  now()
) RETURNING *;
```

## Event Flow

1. **Sign Up Flow**
   ```typescript
   validateInput -> createUser -> sendVerification -> createSession
   ```

2. **Sign In Flow**
   ```typescript
   validateCredentials -> checkMFA -> createSession -> redirect
   ```

3. **Password Reset**
   ```typescript
   requestReset -> validateToken -> updatePassword -> revokeOldSessions
   ```

## Security Considerations

### Rate Limiting

```typescript
const RATE_LIMITS = {
  SIGN_IN: {
    window: 300,     // 5 minutes
    maxAttempts: 5
  },
  PASSWORD_RESET: {
    window: 3600,    // 1 hour
    maxAttempts: 3
  }
};
```

### Session Configuration

```typescript
const SESSION_CONFIG = {
  expirationTime: 3600,   // 1 hour
  renewalWindow: 300,     // 5 minutes
  maxConcurrent: 5
};
```

### Security Headers

```typescript
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'"
};
```
