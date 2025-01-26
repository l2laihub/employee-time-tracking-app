# Core Features

## Invite Management

### Creating Invites

```typescript
const result = await createInvite(
  email,
  role,
  organizationId,
  isSignupFlow
);
```

Features:
- Email validation
- Role assignment
- Organization verification
- Duplicate prevention

### Listing Organization Invites

```typescript
const invites = await listOrgInvites(organizationId);
```

Capabilities:
- Organization filtering
- Active invite listing
- Invite status tracking
- Role information

## Signup Flow

### Invite-Based Signup

```typescript
// During signup with invite
const result = await createInvite(
  email,
  role,
  orgId,
  true // isSignupFlow
);
```

Features:
- Invite validation
- Member creation
- Role assignment
- Redirect handling

### Organization Membership

```typescript
// Creating organization membership
const memberData = await createMember({
  userId,
  organizationId,
  role
});
```

Capabilities:
- Role-based access
- Organization linking
- Member tracking
- Access control

## Email Integration

### Invite Notifications

```typescript
// Sending invite email
await sendInviteEmail({
  email,
  organizationName,
  inviteUrl,
  role
});
```

Features:
- Custom templates
- Organization branding
- Role information
- Tracking links

### Reminder System

```typescript
// Sending reminder for pending invite
await sendInviteReminder({
  inviteId,
  email,
  daysElapsed
});
```

Capabilities:
- Scheduled reminders
- Expiration notices
- Click tracking
- Status updates

## Role Management

### Role Assignment

```typescript
// Assigning role during invite
const invite = await createInvite(
  email,
  'admin', // role
  orgId
);
```

Features:
- Role validation
- Permission mapping
- Access levels
- Role hierarchy

### Role Modification

```typescript
// Updating member role
await updateMemberRole(
  memberId,
  newRole
);
```

Capabilities:
- Role changes
- Permission updates
- History tracking
- Access control

## Organization Integration

### Member Management

```typescript
// Managing organization members
const members = await getOrgMembers(orgId);
```

Features:
- Member listing
- Role filtering
- Status tracking
- Access control

### Access Control

```typescript
// Checking member access
const canAccess = await checkMemberAccess(
  userId,
  orgId,
  requiredRole
);
```

Capabilities:
- Permission checking
- Role validation
- Access logging
- Security enforcement

## Audit Trail

### Invite Tracking

```typescript
// Tracking invite events
await logInviteEvent({
  inviteId,
  event: 'created',
  metadata
});
```

Features:
- Event logging
- Status changes
- User actions
- Time tracking

### Member Activity

```typescript
// Tracking member activity
await logMemberActivity({
  memberId,
  action,
  details
});
```

Capabilities:
- Activity logging
- Role changes
- Access attempts
- Time tracking
