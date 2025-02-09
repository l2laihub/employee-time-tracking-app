-- Drop existing policy
DROP POLICY IF EXISTS "Users can update their draft timesheets" ON timesheets;

-- Create updated policy that allows users to update draft and submitted timesheets
CREATE POLICY "Users can update their draft and submitted timesheets"
    ON timesheets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
        AND status IN ('draft', 'submitted')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
        AND status IN ('draft', 'submitted')
    );
