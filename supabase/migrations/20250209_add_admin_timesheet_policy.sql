-- Add policy for admins to update any timesheets in their organization
CREATE POLICY "Admins can update any timesheets in their organization"
    ON timesheets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = timesheets.organization_id
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = timesheets.organization_id
            AND role = 'admin'
        )
    );
