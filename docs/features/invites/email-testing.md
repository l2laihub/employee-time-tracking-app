# Email Testing Guide

## Development Mode Requirements

When testing the invite system in development mode, there are some important requirements to note:

1. Email Verification
   - In development mode, emails can only be sent to verified email addresses
   - Email addresses must be verified in the Resend dashboard
   - This is a security measure to prevent accidental email sending during development

2. Verified Sender Domain
   - Using `invites@resend.dev` as the sender address for development
   - This is a pre-verified domain provided by Resend for testing

## Testing Steps

### 1. Email Verification Setup
1. Log into the [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to the Email Addresses section
3. Add and verify your test email address
4. Wait for the verification email and click the verification link

### 2. Basic Email Testing
```bash
# Run the email test script
npm run test:email your.verified@email.com
```

### 3. Testing Through UI
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Navigate to the Manage Invites page
3. Use a verified email address for testing
4. Observe the development mode warning banner
5. Send test invites and verify receipt

### 4. Error Cases Testing
1. Unverified Email
   - Try sending to an unverified email
   - Verify the appropriate error message is shown
   - Check that the error is properly logged

2. Invalid Email Format
   - Test with invalid email formats
   - Verify validation errors are shown
   - Check form handling prevents submission

3. Network Issues
   - Test with network disabled
   - Verify error handling works
   - Check retry mechanism

### 5. Email Content Verification
1. Check email rendering
   - Verify branding elements
   - Check responsive design
   - Test in different email clients

2. Verify Links
   - Check invite link functionality
   - Verify link expiration
   - Test link security

## Production Testing

For production testing:

1. Domain Verification
   - Verify your production domain in Resend
   - Update the fromEmail configuration
   - Test with production API keys

2. Email Monitoring
   - Monitor email delivery rates
   - Check bounce rates
   - Track email engagement

## Troubleshooting

### Common Issues

1. "Unauthorized recipient" error
   - Cause: Trying to send to an unverified email in development
   - Solution: Verify the recipient email in Resend dashboard

2. Email not received
   - Check spam folder
   - Verify email address is correct
   - Check Resend logs for delivery status

3. Template rendering issues
   - Check React Email components
   - Verify HTML compatibility
   - Test in multiple email clients

### Debugging

1. Check the console for detailed logs:
   - Email service initialization
   - Template rendering
   - API responses
   - Error details

2. Use the test script for isolated testing:
   ```bash
   npm run test:email your.verified@email.com
   ```

3. Review Resend dashboard:
   - Check email delivery status
   - View email content
   - Monitor error logs

## Best Practices

1. Always use verified emails during development
2. Keep a list of test email addresses
3. Document any template changes
4. Test across different email clients
5. Monitor email delivery metrics

## Next Steps

1. Set up automated email testing
2. Implement email analytics
3. Add email template versioning
4. Create email preview functionality