# Invite Acceptance Flow Fix

## Current Issue
When following the sign-up flow through an invite link, users are redirected to the "Create Your Organization" view instead of being automatically joined to the organization they were invited to.

## Root Cause
1. The signup flow loses the invite context when processing the registration
2. While the code checks for pending invites, it doesn't specifically handle the invite code from the URL
3. The redirect URL parameter is not being utilized properly

## Solution

### 1. Modify Signup Component
Add URL parameter handling to maintain invite context:
```typescript
// Get invite code and redirect from URL params
const searchParams = new URLSearchParams(window.location.search);
const inviteCode = searchParams.get('code');
const redirectPath = searchParams.get('redirect');
```

Update invite handling logic to:
1. First try to accept the specific invite from the URL
2. Fall back to checking other pending invites only if no specific invite code exists

### 2. Implementation Steps

1. Update Signup.tsx to handle invite code:
   - Extract invite code from URL parameters
   - Modify invite acceptance logic to prioritize the specific invite
   - Ensure proper redirect after successful signup

2. Update AcceptInvite.tsx link generation:
   - Ensure invite code is properly passed to signup URL
   - Maintain redirect path for successful flow

### 3. Testing Scenarios

1. New user signup through invite link:
   - Click invite link
   - Choose "Create Account"
   - Complete signup
   - Should automatically join organization and redirect to dashboard

2. Existing user through invite link:
   - Click invite link
   - Choose "Log in"
   - Complete login
   - Should automatically join organization and redirect to dashboard

3. Direct signup (no invite):
   - Navigate directly to signup
   - Complete signup
   - Should redirect to organization creation

## Implementation Plan

1. Update Signup component to handle invite context
2. Test all scenarios
3. Deploy changes
4. Monitor for any issues

## Success Criteria

1. Users following invite link signup flow are automatically joined to the correct organization
2. Users are properly redirected to the dashboard after signup
3. No disruption to regular signup flow (without invite)