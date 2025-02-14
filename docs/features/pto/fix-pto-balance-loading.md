# Fix PTO Balance Loading Issue

## Current Problem
The PTO Request Form is having issues loading PTO balance because it's using an incorrect approach to find the employee record. Currently, it's using `getEmployeeByUserId` which tries to join the employees table directly with organization_members using user_id, but this can fail if the employee record exists but isn't properly linked.

## Database Schema Context
- `auth.users` contains user authentication info including email
- `employees` table contains employee records with email field
- `organization_members` links users to organizations

## Solution Plan

### 1. Modify getEmployeeByUserId Function
Update the function to:
1. First get the user's email from auth.users
2. Use the email to find the matching employee record
3. Verify organization membership
4. Update member_id if needed to maintain proper links

```typescript
export async function getEmployeeByUserId(userId: string, organizationId?: string): Promise<EmployeeResult> {
  try {
    // First get user's email from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) throw new Error('User not found');

    // Get both member and employee records
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        organization_members!inner (
          id,
          user_id,
          role
        )
      `)
      .eq('organization_id', organizationId)
      .eq('email', user.email)
      .maybeSingle();

    if (employeeError) throw employeeError;

    // If found employee but member_id doesn't match, update it
    if (employeeData && employeeData.organization_members?.user_id !== userId) {
      const { data: updatedEmployee, error: updateError } = await supabase
        .from('employees')
        .update({ 
          member_id: employeeData.organization_members.id 
        })
        .eq('id', employeeData.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return {
        success: true,
        data: updatedEmployee
      };
    }

    return {
      success: true,
      data: employeeData
    };
  } catch (error) {
    console.error('Getting employee by user ID failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
```

### 2. Impact
This change will:
- Fix PTO balance loading issues
- Maintain proper links between auth users, organization members, and employees
- Handle cases where email matches but member_id needs updating

### 3. Testing Plan
1. Test with existing employee records:
   - Employee exists with correct member_id
   - Employee exists but member_id needs updating
   - Employee doesn't exist
2. Test PTO balance loading in the form for:
   - Regular employees
   - Admin users
   - New users

### 4. Implementation Steps
1. Update `getEmployeeByUserId` function
2. Deploy changes
3. Monitor PTO balance loading in production
4. Add logging to track any remaining issues

## Next Steps
After reviewing this plan, we should:
1. Switch to Code mode to implement the changes
2. Test thoroughly
3. Monitor the system after deployment