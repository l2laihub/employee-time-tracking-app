-- Add SELECT policies for timesheets
CREATE POLICY "Users can view their own timesheets"
    ON timesheets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM employees e
            JOIN organization_members om ON e.member_id = om.id
            WHERE e.id = employee_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins can view all timesheets"
    ON timesheets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = timesheets.organization_id
            AND (role = 'admin' OR role = 'manager')
        )
    );
