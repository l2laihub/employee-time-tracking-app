# Invite Acceptance Flow

## Simplified Approach

### 1. Initial Invite Link

When a user clicks the invite link (`/accept-invite?code={inviteId}`):

1. Validate the invite code
2. Extract the invited email
3. Direct to a single acceptance page

### 2. Unified Acceptance Page

Create a single `AcceptInvite` page that handles both scenarios:

```typescript
// AcceptInvite.tsx
function AcceptInvite() {
  const { inviteId } = useParams();
  const { user } = useAuth();
  
  // If user is logged in with correct email -> Auto accept
  // If not -> Show login/signup options
}
```

### 3. Simplified User Flow

#### Already Logged In
- If email matches invite -> Auto accept and redirect to dashboard
- If email doesn't match -> Show message to log in with correct email

#### Not Logged In
- Show two clear options:
  1. "Log in" (for existing users)
  2. "Create Account" (for new users)
- Both forms pre-fill the invited email
- After authentication -> Auto accept and redirect to dashboard

### 4. Key Improvements

1. Single Entry Point
   - One page handles all scenarios
   - Clearer user journey
   - Simpler codebase

2. Automatic Flow
   - Auto-accept after authentication
   - No manual "accept" step needed
   - Immediate access to organization

3. Pre-filled Information
   - Email pre-filled in forms
   - Reduced user input
   - Fewer errors

4. Enhanced User Feedback
   - Clear loading states during signup and organization setup
   - Progress indicators for long-running operations
   - Success messages at key steps:
     * Account creation
     * Organization joining
   - Proper error handling with user-friendly messages
   - No lingering loading states

5. Robust State Management
   - Proper cleanup of loading states
   - Clear separation between signup and organization setup
   - Guaranteed cleanup in error scenarios
   - Smooth transitions between states

### 5. Security Measures

1. Basic Checks
   - Valid invite code
   - Matching email
   - Not expired/revoked

2. Auto-accept Safety
   - Verify email match
   - Single-use invite
   - Audit logging

## Implementation Plan

### Frontend Changes

1. Simplified AcceptInvite.tsx:
```typescript
function AcceptInvite() {
  const { inviteId } = useParams();
  const { user } = useAuth();
  const [invite, setInvite] = useState(null);

  // 1. Load and validate invite
  // 2. If user logged in + email matches -> Accept
  // 3. If not -> Show login/signup options
}
```

### Backend Changes

1. Single RPC function:
```sql
create function accept_organization_invite(
  p_invite_id uuid,
  p_user_id uuid
) returns void
language plpgsql
as $$
begin
  -- Validate invite
  -- Create membership
  -- Mark invite as accepted
end;
$$;
```

### Error Handling

1. User-Facing Messages:
   - Account Creation: Clear error messages for signup issues
   - Organization Setup: Specific messages for each failure case
   - Invite Validation: Proper handling of invalid/expired invites
   - Access Control: Clear messages for permission issues

2. Technical Error Handling:
   - Proper cleanup of loading states
   - Guaranteed toast dismissal
   - State restoration on errors
   - Logging for debugging

3. Error Scenarios:
   - Invalid/expired invites: "This invite is no longer valid"
   - Wrong email: "Please log in with [email]"
   - Organization setup failure: "Could not complete organization setup"
   - Network issues: "Unable to connect, please try again"
   - Permission issues: "You don't have permission to join this organization"

### Testing Scenarios

1. Happy Path:
   - Click invite link
   - Complete signup
   - Verify automatic organization joining
   - Check dashboard access

2. Error Cases:
   - Expired invites
   - Network failures
   - Permission issues
   - Concurrent access

3. State Management:
   - Loading states appear/disappear correctly
   - No lingering notifications
   - Proper cleanup in all scenarios

4. User Experience:
   - Clear progress indication
   - Informative error messages
   - Smooth transitions
   - No UI glitches

## Next Steps

1. Monitor error rates and user feedback
2. Gather metrics on flow completion rates
3. Iterate on error messages based on user feedback
4. Consider adding retry mechanisms for transient failures