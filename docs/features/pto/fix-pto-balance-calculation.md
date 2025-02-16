# Fix PTO Balance Calculation Issue

## Problem
The PTO Request Form was displaying incorrect available hours because used hours were being subtracted twice:
1. First in the base balance calculation (`getVacationBalance`/`getSickLeaveBalance`)
2. Then again in the `getPTOBalance` function when calculating the final balance

This resulted in:
- Total Allocation showing correctly (e.g., 32 hours)
- Used hours showing correctly (e.g., 48 hours)
- But Available hours being incorrect (showing -16 hours instead of 32 hours)

## Solution
Modified the `getPTOBalance` function in PTOContext.tsx to return the base balance directly since used hours are already accounted for in the base balance calculation functions (`getVacationBalance`/`getSickLeaveBalance`).

### Code Changes
```typescript
// Before
const finalBalance = Math.max(0, baseBalance - activeHours);
return finalBalance;

// After
return baseBalance;
```

## Testing
To verify the fix:
1. Check PTO Request Form displays correct available hours
2. Verify total allocation matches policy
3. Confirm used hours are counted only once
4. Test with both vacation and sick leave requests

## Impact
This fix ensures:
- Accurate display of available PTO hours
- Correct validation of new PTO requests
- Proper enforcement of PTO policies