-- Drop existing function if it exists
drop function if exists create_pto_request;

-- Create function to handle PTO request creation
create or replace function create_pto_request(
  p_user_id uuid,
  p_organization_id uuid,
  p_start_date date,
  p_end_date date,
  p_type text,
  p_hours numeric,
  p_reason text
) returns json as $$
declare
  v_employee_id uuid;
  v_member_role text;
  v_result json;
begin
  -- Get organization member role
  select role into v_member_role
  from organization_members
  where user_id = auth.uid()
  and organization_id = p_organization_id;

  if v_member_role is null then
    return json_build_object(
      'success', false,
      'error', 'User is not a member of this organization'
    );
  end if;

  -- Get employee ID
  select id into v_employee_id
  from employees
  where organization_id = p_organization_id
  and id = p_user_id;

  if v_employee_id is null then
    return json_build_object(
      'success', false,
      'error', 'Employee not found in organization'
    );
  end if;

  -- Insert PTO request
  insert into pto_requests (
    user_id,
    organization_id,
    start_date,
    end_date,
    type,
    hours,
    reason,
    status
  ) values (
    v_employee_id,
    p_organization_id,
    p_start_date,
    p_end_date,
    p_type,
    p_hours,
    p_reason,
    'pending'
  ) returning to_json(pto_requests.*) into v_result;

  return json_build_object(
    'success', true,
    'data', v_result
  );
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function create_pto_request to authenticated;

-- Remove direct table policies
drop policy if exists "Users can create own PTO requests" on public.pto_requests;