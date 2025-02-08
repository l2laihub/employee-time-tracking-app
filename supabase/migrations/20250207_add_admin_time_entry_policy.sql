-- Add policy for admins to update any time entries in their organization
CREATE POLICY "Admins can update any time entries in their organization" ON time_entries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = time_entries.organization_id 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = time_entries.organization_id 
            AND role = 'admin'
        )
    );
