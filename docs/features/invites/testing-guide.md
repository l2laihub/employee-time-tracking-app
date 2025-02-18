# Testing Guide: Organization Invites

## Prerequisites

1. Environment Setup
   ```env
   VITE_RESEND_API_KEY=your_resend_api_key
   VITE_APP_URL=http://localhost:5173
   ```

2. Verify Email Address
   - Go to [Resend Dashboard](https://resend.com/dashboard)
   - Add and verify your email address
   - Wait for verification email and click the link

## Test Script

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the test script:
   ```bash
   npm run test:email your.verified@email.com
   ```

   This will:
   - Initialize the email service
   - Send a test email
   - Log the results

## Manual Testing Steps

1. Start Development Server
   ```bash
   npm run dev
   ```

2. Test Invite Flow
   - Log in as an admin user
   - Navigate to Manage Invites page
   - Send invite to verified email
   - Check email receipt
   - Verify invite appears in pending list

3. Test Error Cases
   - Try sending to unverified email (should show warning)
   - Try invalid email formats
   - Test duplicate invites
   - Test expired invites

4. Test Revocation
   - Create test invite
   - Click revoke button
   - Confirm dialog appears
   - Verify invite disappears from list

## Common Issues

1. Email Not Received
   - Check console for email service logs
   - Verify email address is verified in Resend
   - Check spam folder
   - Verify Resend API key is correct

2. TypeScript Errors
   - Run `npm run build` to check for type issues
   - Verify imports and types are correct

3. Database Issues
   - Check Supabase logs
   - Verify database constraints
   - Check RLS policies

## Development Mode Notes

In development mode:
1. Emails can only be sent to verified addresses
2. Use `invites@resend.dev` as the sender
3. Development warning banner will be shown
4. Additional logging is enabled

## Testing Checklist

### Email Service
- [ ] Email service initializes correctly
- [ ] Test email sends successfully
- [ ] HTML templates render properly
- [ ] Email tracking works

### Invite Management
- [ ] Can create new invites
- [ ] Invites appear in pending list
- [ ] Can revoke invites
- [ ] Duplicate prevention works

### Error Handling
- [ ] Invalid email validation
- [ ] Unverified email warning
- [ ] Database error handling
- [ ] Network error handling

### UI/UX
- [ ] Loading states show correctly
- [ ] Error messages are clear
- [ ] Success feedback works
- [ ] Confirmation dialogs appear

## Monitoring

1. Check Resend Dashboard
   - Email delivery status
   - Bounce rates
   - Open rates

2. Check Application Logs
   - Email service initialization
   - Invite operations
   - Error handling

3. Check Database
   - Invite records
   - Member relationships
   - Audit logs

## Next Steps

After testing:
1. Document any issues found
2. Update error messages if needed
3. Improve logging if required
4. Plan for production deployment