-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_employee_pto_update_trigger ON employees;
DROP FUNCTION IF EXISTS check_employee_pto_update;

-- Create a modified trigger function that allows users to update their own basic info
CREATE OR REPLACE FUNCTION check_employee_pto_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip check if user is admin
    IF EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = NEW.id
        AND e.organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    ) THEN
        RETURN NEW;
    END IF;

    -- Allow users to update their own basic info
    IF EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = NEW.id
        AND e.member_id IN (
            SELECT id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    ) AND (
        -- Only allow updates to basic info fields
        (NEW.first_name != OLD.first_name OR
         NEW.last_name != OLD.last_name OR
         NEW.email != OLD.email OR
         COALESCE(NEW.phone, '') != COALESCE(OLD.phone, ''))
        -- And ensure other fields remain unchanged
        AND NEW.role = OLD.role
        AND COALESCE(NEW.department, '') = COALESCE(OLD.department, '')
        AND NEW.start_date = OLD.start_date
        AND NEW.status = OLD.status
        AND NEW.organization_id = OLD.organization_id
        AND NEW.member_id = OLD.member_id
    ) THEN
        RETURN NEW;
    END IF;

    -- For non-admin users, ensure only PTO field is being updated if not their own record
    IF NEW.first_name != OLD.first_name OR
       NEW.last_name != OLD.last_name OR
       NEW.email != OLD.email OR
       COALESCE(NEW.phone, '') != COALESCE(OLD.phone, '') OR
       NEW.role != OLD.role OR
       COALESCE(NEW.department, '') != COALESCE(OLD.department, '') OR
       NEW.start_date != OLD.start_date OR
       NEW.status != OLD.status OR
       NEW.organization_id != OLD.organization_id OR
       NEW.member_id != OLD.member_id THEN
        RAISE EXCEPTION 'Only PTO settings can be updated';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the modified trigger
CREATE TRIGGER check_employee_pto_update_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION check_employee_pto_update();