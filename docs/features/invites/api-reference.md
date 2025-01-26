# API Reference

## Invite Management

### Create Invite

```typescript
async function createInvite(
  email: string,
  role: string,
  orgId: string,
  isSignupFlow: boolean = false
): Promise<InviteResult>
```

Parameters:
- `email`: Recipient's email address
- `role`: Role to assign (e.g., 'admin', 'manager', 'member')
- `orgId`: Organization identifier
- `isSignupFlow`: Whether this is part of signup process

Returns:
- `InviteResult` with invite details or error

### List Organization Invites

```typescript
async function listOrgInvites(
  orgId: string
): Promise<OrganizationInvite[]>
```

Parameters:
- `orgId`: Organization identifier

Returns:
- Array of organization invites

## Types

### InviteResult

```typescript
interface InviteResult {
  success: boolean;
  inviteId?: string;
  redirectTo?: string;
  error?: string;
}
```

### OrganizationInvite

```typescript
interface OrganizationInvite {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}
```

### OrganizationMember

```typescript
interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

All API methods follow this error pattern:

```typescript
try {
  // API operation
  return {
    success: true,
    inviteId: result.id,
    redirectTo: redirectPath
  };
} catch (error) {
  return {
    success: false,
    error: error.message
  };
}
```

Common error types:
1. Invalid email format
2. Invalid role
3. Duplicate invite
4. Organization not found
5. Unauthorized access

## Usage Examples

### Complete Invite Flow

```typescript
// Create a new invite
const newInvite = await createInvite(
  "user@example.com",
  "manager",
  "org-123"
);

// List organization invites
const invites = await listOrgInvites("org-123");

// Handle signup flow
const signupResult = await createInvite(
  "user@example.com",
  "member",
  "org-123",
  true
);
```

### Error Handling Example

```typescript
// Creating an invite with error handling
async function safeCreateInvite(email: string, role: string, orgId: string) {
  // Validate email
  if (!isValidEmail(email)) {
    return {
      success: false,
      error: 'Invalid email format'
    };
  }

  // Validate role
  if (!isValidRole(role)) {
    return {
      success: false,
      error: 'Invalid role'
    };
  }

  // Create invite
  const result = await createInvite(email, role, orgId);
  
  // Handle result
  if (result.success) {
    await sendInviteEmail(email, result.inviteId);
  }
  
  return result;
}
```

### Organization Management

```typescript
// Managing organization invites
async function manageOrgInvites(orgId: string) {
  // List current invites
  const currentInvites = await listOrgInvites(orgId);
  
  // Filter active invites
  const activeInvites = currentInvites.filter(
    invite => !invite.accepted_at
  );
  
  // Send reminders
  for (const invite of activeInvites) {
    await sendInviteReminder(invite.id);
  }
  
  return activeInvites;
}
```

## Database Operations

### Invite Creation

```sql
INSERT INTO organization_invites (
  email,
  organization_id,
  role
) VALUES (
  $1,
  $2,
  $3
) RETURNING *;
```

### Member Creation

```sql
INSERT INTO organization_members (
  user_id,
  organization_id,
  role
) VALUES (
  $1,
  $2,
  $3
) RETURNING *;
```

## Event Flow

1. **Invite Creation**
   ```typescript
   createInvite -> validateData -> insertInvite -> sendEmail
   ```

2. **Signup Flow**
   ```typescript
   validateInvite -> createMember -> createAccount -> redirect
   ```

3. **List Operation**
   ```typescript
   listInvites -> filterActive -> formatResponse
   ```
