-- Policy for organization members to view their organizations
CREATE POLICY "Organization members can view organizations" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for organization members to view other members in their organization
CREATE POLICY "Organization members can view other members" ON organization_members
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );