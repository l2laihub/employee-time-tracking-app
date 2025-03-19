

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'manager',
    'employee'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."weekly_hours_result" AS (
	"id" "uuid",
	"name" "text",
	"organization_id" "uuid",
	"job_location_ids" "uuid"[],
	"monday" numeric,
	"tuesday" numeric,
	"wednesday" numeric,
	"thursday" numeric,
	"friday" numeric,
	"saturday" numeric,
	"sunday" numeric,
	"total_regular" numeric,
	"total_ot" numeric,
	"vacation_hours" numeric,
	"sick_leave_hours" numeric,
	"vacation_balance" numeric,
	"sick_leave_balance" numeric
);


ALTER TYPE "public"."weekly_hours_result" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_role user_role;
  v_email text;
begin
  -- Get the current user's ID and email
  select auth.uid() into v_user_id;
  select auth.jwt() ->> 'email' into v_email;

  -- Get and validate the invite
  select organization_id, role into v_organization_id, v_role
  from organization_invites
  where id = p_invite_id
  and lower(email) = lower(v_email)
  and status = 'pending'
  and expires_at > now();

  if v_organization_id is null then
    raise exception 'Invalid or expired invite';
  end if;

  -- Check if user is already a member
  if exists (
    select 1 from organization_members
    where organization_id = v_organization_id
    and user_id = v_user_id
  ) then
    raise exception 'User is already a member of this organization';
  end if;

  -- Create organization member
  insert into organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    v_organization_id,
    v_user_id,
    v_role
  );

  -- Update invite status
  update organization_invites
  set
    status = 'accepted',
    accepted_at = now()
  where id = p_invite_id;

  -- Mark other pending invites for this email as expired
  update organization_invites
  set
    status = 'expired'
  where lower(email) = lower(v_email)
  and status = 'pending'
  and id != p_invite_id;
end;
$$;


ALTER FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid", "p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_invite record;
  v_user record;
  v_result json;
begin
  -- Get invite details
  select * into v_invite
  from organization_invites
  where id = p_invite_id
  and status = 'pending'
  for update;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Invite not found or already used'
    );
  end if;

  -- Check if invite is expired
  if v_invite.expires_at < now() then
    return json_build_object(
      'success', false,
      'error', 'Invite has expired'
    );
  end if;

  -- Get user email
  select email into v_user
  from auth.users
  where id = p_user_id;

  -- Verify email matches invite
  if v_user.email != v_invite.email then
    return json_build_object(
      'success', false,
      'error', 'Email does not match invite'
    );
  end if;

  -- Create organization membership
  insert into organization_members (
    user_id,
    organization_id,
    role
  ) values (
    p_user_id,
    v_invite.organization_id,
    v_invite.role
  )
  on conflict (user_id, organization_id) do nothing;

  -- Update invite status
  update organization_invites
  set 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id
  where id = p_invite_id;

  return json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id
  );
end;
$$;


ALTER FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_hours"("start_time" timestamp with time zone, "end_time" timestamp with time zone, "break_duration" integer DEFAULT 0) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF end_time IS NULL THEN
        RETURN 0;
    END IF;
    RETURN ROUND(
        (EXTRACT(EPOCH FROM (end_time - start_time))/3600 - (break_duration::decimal/60))::decimal,
        2
    );
END;
$$;


ALTER FUNCTION "public"."calculate_hours"("start_time" timestamp with time zone, "end_time" timestamp with time zone, "break_duration" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_organization_access"("p_org_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = p_org_id 
    AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."check_organization_access"("p_org_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_organization_admin"("p_org_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = p_org_id 
    AND user_id = p_user_id
    AND role = 'admin'::public.user_role
  );
$$;


ALTER FUNCTION "public"."check_organization_admin"("p_org_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_table_exists"("table_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = check_table_exists.table_name
  ) INTO result;
  
  RETURN jsonb_build_object('exists', result);
END;
$$;


ALTER FUNCTION "public"."check_table_exists"("table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_time_entry_access"("p_employee_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM employees e
        JOIN organization_members om ON e.member_id = om.id
        WHERE e.id = p_employee_id
        AND om.user_id = p_user_id
    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_time_entry_access"("p_employee_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_role_type"() RETURNS TABLE("enum_name" "text", "enum_values" "text"[], "schema_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.typname::text,
        array_agg(e.enumlabel)::text[],
        n.nspname::text
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'user_role'
    GROUP BY t.typname, n.nspname;
END;
$$;


ALTER FUNCTION "public"."check_user_role_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_backup_tables"("days_to_retain" integer DEFAULT 30) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    backup_table TEXT;
BEGIN
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name LIKE '%_backup_%'
        AND table_schema = 'public'
        AND to_timestamp(regexp_replace(table_name, '^.*_(\d{8}_\d{6})$', '\1'), 'YYYYMMDD_HH24MISS')
            < current_timestamp - (days_to_retain || ' days')::interval
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I', backup_table);
    END LOOP;
END;
$_$;


ALTER FUNCTION "public"."cleanup_old_backup_tables"("days_to_retain" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_user_backup_tables"("days_to_retain" integer DEFAULT 30) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    backup_table TEXT;
BEGIN
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name LIKE 'auth_%_backup_%'
        AND table_schema = 'public'
        AND to_timestamp(regexp_replace(table_name, '^.*_(\d{8}_\d{6})$', '\1'), 'YYYYMMDD_HH24MISS')
            < current_timestamp - (days_to_retain || ' days')::interval
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I', backup_table);
    END LOOP;
END;
$_$;


ALTER FUNCTION "public"."cleanup_old_user_backup_tables"("days_to_retain" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_subscription_plan_stripe_ids"("plan_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.subscription_plans
  SET 
    stripe_product_id = NULL,
    stripe_monthly_price_id = NULL,
    stripe_annual_price_id = NULL
  WHERE id = plan_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."clear_subscription_plan_stripe_ids"("plan_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_slug TEXT;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug from name
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));

  -- Create organization using the transaction function
  SELECT organization_id INTO v_org_id
  FROM create_organization_transaction(
    p_name,
    v_slug,
    v_user_id,
    NULL
  );

  RETURN v_org_id;
END;
$$;


ALTER FUNCTION "public"."create_organization"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization_invite"("p_organization_id" "uuid", "p_email" "text", "p_role" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_invite_id uuid;
  v_user_id uuid;
  v_email text;
begin
  -- Get the current user's ID and email
  select auth.uid() into v_user_id;
  select auth.jwt() ->> 'email' into v_email;

  -- Check if the user has permission to create invites
  if not exists (
    select 1 from organization_members
    where organization_id = p_organization_id
    and user_id = v_user_id
    and role in ('admin', 'manager')
  ) then
    raise exception 'Only organization admins and managers can create invites';
  end if;

  -- Create the invite
  insert into organization_invites (
    organization_id,
    email,
    role,
    invited_by
  )
  values (
    p_organization_id,
    lower(p_email),
    p_role::user_role,
    v_user_id
  )
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;


ALTER FUNCTION "public"."create_organization_invite"("p_organization_id" "uuid", "p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization_transaction"("p_name" "text", "p_slug" "text", "p_user_id" "uuid", "p_branding" "jsonb") RETURNS TABLE("organization_id" "uuid", "member_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_member_id UUID;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Create organization
  INSERT INTO organizations (
    name,
    slug,
    branding
  ) VALUES (
    p_name,
    p_slug,
    COALESCE(p_branding, '{
      "primary_color": "#3b82f6",
      "secondary_color": "#1e40af",
      "logo_url": null,
      "favicon_url": null,
      "company_name": null,
      "company_website": null
    }'::jsonb)
  )
  RETURNING id INTO v_org_id;

  -- Add user as admin
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role
  ) VALUES (
    v_org_id,
    p_user_id,
    'admin'::public.user_role
  )
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_org_id, v_member_id;
END;
$$;


ALTER FUNCTION "public"."create_organization_transaction"("p_name" "text", "p_slug" "text", "p_user_id" "uuid", "p_branding" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization_with_admin"("org_name" "text", "org_slug" "text", "admin_user_id" "uuid") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "user_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Add the creator as an admin
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, admin_user_id, 'admin');

  -- Return the new organization details
  RETURN QUERY
  SELECT 
    new_org_id as organization_id,
    org_name as organization_name,
    'admin'::text as user_role;
END;
$$;


ALTER FUNCTION "public"."create_organization_with_admin"("org_name" "text", "org_slug" "text", "admin_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_pto_request"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_hours" numeric, "p_reason" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    status,
    created_by
  ) values (
    v_employee_id,
    p_organization_id,
    p_start_date,
    p_end_date,
    p_type,
    p_hours,
    p_reason,
    'pending',
    auth.uid()
  ) returning to_json(pto_requests.*) into v_result;

  return json_build_object(
    'success', true,
    'data', v_result
  );
end;
$$;


ALTER FUNCTION "public"."create_pto_request"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_hours" numeric, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_test_data_backups"("test_org_ids" "uuid"[], "cleanup_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    timestamp_suffix TEXT;
    created_backup_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    timestamp_suffix := to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
    
    -- Create backup tables for each affected table
    EXECUTE format(
        'CREATE TABLE public.organizations_backup_%s AS
         SELECT * FROM public.organizations WHERE id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('organizations_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.subscriptions_backup_%s AS
         SELECT * FROM public.subscriptions WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('subscriptions_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.organization_members_backup_%s AS
         SELECT * FROM public.organization_members WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('organization_members_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.employees_backup_%s AS
         SELECT e.* FROM public.employees e
         JOIN public.organization_members om ON e.member_id = om.id
         WHERE om.organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('employees_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.organization_invites_backup_%s AS
         SELECT * FROM public.organization_invites WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('organization_invites_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.time_entries_backup_%s AS
         SELECT * FROM public.time_entries WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('time_entries_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.job_locations_backup_%s AS
         SELECT * FROM public.job_locations WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('job_locations_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.pto_requests_backup_%s AS
         SELECT * FROM public.pto_requests WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('pto_requests_backup_%s', timestamp_suffix);
    
    -- Update cleanup log with backup tables
    UPDATE public.cleanup_logs
    SET backup_tables = created_backup_tables
    WHERE id = cleanup_id;
    
    -- Create indexes on backup tables
    FOR i IN 1..array_length(created_backup_tables, 1) LOOP
        -- Create appropriate index based on table type
        IF created_backup_tables[i] LIKE 'organizations_backup_%' THEN
            EXECUTE format(
                'CREATE INDEX ON public.%I (id)',
                created_backup_tables[i]
            );
        ELSE
            EXECUTE format(
                'CREATE INDEX ON public.%I (organization_id)',
                created_backup_tables[i]
            );
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "public"."create_test_data_backups"("test_org_ids" "uuid"[], "cleanup_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_test_user_backups"("test_user_ids" "uuid"[], "cleanup_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    timestamp_suffix TEXT;
    created_backup_tables TEXT[] := ARRAY[]::TEXT[];
    user_id_list TEXT;
BEGIN
    timestamp_suffix := to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
    
    -- Convert UUID array to a comma-separated string of quoted UUIDs
    SELECT string_agg(quote_literal(id::TEXT), ',') INTO user_id_list FROM unnest(test_user_ids) AS id;
    
    -- Create backup tables for each affected table using explicit IN clause
    BEGIN
        EXECUTE format(
            'CREATE TABLE public.auth_users_backup_%s AS
             SELECT * FROM auth.users WHERE id::TEXT IN (%s)',
            timestamp_suffix, user_id_list
        );
        created_backup_tables := created_backup_tables || format('auth_users_backup_%s', timestamp_suffix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating auth_users_backup: %', SQLERRM;
        RAISE;
    END;
    
    BEGIN
        EXECUTE format(
            'CREATE TABLE public.auth_identities_backup_%s AS
             SELECT * FROM auth.identities WHERE user_id::TEXT IN (%s)',
            timestamp_suffix, user_id_list
        );
        created_backup_tables := created_backup_tables || format('auth_identities_backup_%s', timestamp_suffix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating auth_identities_backup: %', SQLERRM;
        RAISE;
    END;
    
    BEGIN
        EXECUTE format(
            'CREATE TABLE public.auth_sessions_backup_%s AS
             SELECT * FROM auth.sessions WHERE user_id::TEXT IN (%s)',
            timestamp_suffix, user_id_list
        );
        created_backup_tables := created_backup_tables || format('auth_sessions_backup_%s', timestamp_suffix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating auth_sessions_backup: %', SQLERRM;
        RAISE;
    END;
    
    BEGIN
        EXECUTE format(
            'CREATE TABLE public.auth_mfa_factors_backup_%s AS
             SELECT * FROM auth.mfa_factors WHERE user_id::TEXT IN (%s)',
            timestamp_suffix, user_id_list
        );
        created_backup_tables := created_backup_tables || format('auth_mfa_factors_backup_%s', timestamp_suffix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating auth_mfa_factors_backup: %', SQLERRM;
        RAISE;
    END;
    
    BEGIN
        EXECUTE format(
            'CREATE TABLE public.auth_mfa_challenges_backup_%s AS
             SELECT amc.* FROM auth.mfa_challenges amc
             JOIN auth.mfa_factors amf ON amc.factor_id = amf.id
             WHERE amf.user_id::TEXT IN (%s)',
            timestamp_suffix, user_id_list
        );
        created_backup_tables := created_backup_tables || format('auth_mfa_challenges_backup_%s', timestamp_suffix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating auth_mfa_challenges_backup: %', SQLERRM;
        RAISE;
    END;
    
    BEGIN
        EXECUTE format(
            'CREATE TABLE public.auth_refresh_tokens_backup_%s AS
             SELECT * FROM auth.refresh_tokens WHERE user_id::TEXT IN (%s)',
            timestamp_suffix, user_id_list
        );
        created_backup_tables := created_backup_tables || format('auth_refresh_tokens_backup_%s', timestamp_suffix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating auth_refresh_tokens_backup: %', SQLERRM;
        RAISE;
    END;
    
    -- Update cleanup log with backup tables
    UPDATE public.user_cleanup_logs
    SET backup_tables = created_backup_tables
    WHERE id = cleanup_id;
    
    -- Create indexes on backup tables
    FOR i IN 1..array_length(created_backup_tables, 1) LOOP
        BEGIN
            IF created_backup_tables[i] LIKE 'auth_users_backup_%' THEN
                EXECUTE format(
                    'CREATE INDEX ON public.%I (id)',
                    created_backup_tables[i]
                );
            ELSE
                EXECUTE format(
                    'CREATE INDEX ON public.%I (user_id)',
                    created_backup_tables[i]
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating index on %: %', created_backup_tables[i], SQLERRM;
            -- Continue with other indexes even if one fails
        END;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_test_user_backups"("test_user_ids" "uuid"[], "cleanup_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_organization_invites"("p_email" "text") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "email" "text", "role" "public"."user_role", "status" "text", "invited_by" "uuid", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "inviter_email" "text", "organization_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Check if the user is authorized to view this email's invites
  if not (
    lower(auth.jwt() ->> 'email') = lower(p_email) or
    exists (
      select 1 from organization_members om
      join organization_invites oi on oi.organization_id = om.organization_id
      where om.user_id = auth.uid()
      and om.role in ('admin', 'manager')
      and lower(oi.email) = lower(p_email)
    )
  ) then
    raise exception 'Not authorized to view invites for this email';
  end if;

  return query
  select 
    i.id,
    i.organization_id,
    i.email,
    i.role,
    i.status,
    i.invited_by,
    i.created_at,
    i.expires_at,
    u.email as inviter_email,
    o.name as organization_name
  from organization_invites i
  left join auth.users u on u.id = i.invited_by
  left join organizations o on o.id = i.organization_id
  where lower(i.email) = lower(p_email)
  order by i.created_at desc;
end;
$$;


ALTER FUNCTION "public"."debug_organization_invites"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_weekly_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid", "employee_id" "uuid") RETURNS TABLE("entry_date" "date", "clock_in_raw" timestamp with time zone, "clock_in_la" timestamp with time zone, "clock_out_raw" timestamp with time zone, "clock_out_la" timestamp with time zone, "day_of_week" integer, "day_name" "text", "raw_duration_hours" numeric, "break_minutes" numeric, "worked_hours" numeric, "regular_hours" numeric, "overtime_hours" numeric, "status" "text", "user_id" "uuid", "organization_id" "uuid", "included_in_results" boolean, "exclusion_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user has access to organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this organization''s data';
  END IF;

  RETURN QUERY
  WITH employee_user AS (
    SELECT 
      om.user_id,
      om.organization_id,
      e.id as employee_id
    FROM employees e
    JOIN organization_members om ON e.member_id = om.id
    WHERE e.id = employee_id
  )
  SELECT 
    DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'),
    te.clock_in,
    te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles',
    te.clock_out,
    te.clock_out AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles',
    to_char(DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'), 'ID')::integer,
    to_char(DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles'), 'Day'),
    ROUND((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600)::numeric, 2) as raw_duration,
    COALESCE(te.total_break_minutes, 0)::numeric as break_minutes,
    ROUND((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric, 2) as worked_hours,
    CASE 
      WHEN (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0) <= 8 
      THEN ROUND((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric, 2)
      ELSE 8::numeric
    END as regular_hours,
    CASE 
      WHEN (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0) > 8 
      THEN ROUND(((EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0) - 8)::numeric, 2)
      ELSE 0::numeric
    END as overtime_hours,
    te.status,
    eu.user_id,
    te.organization_id,
    CASE WHEN 
      te.clock_out IS NOT NULL 
      AND te.status = 'completed'
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
    THEN true ELSE false END as included_in_results,
    CASE 
      WHEN te.clock_out IS NULL THEN 'No clock out'
      WHEN te.status != 'completed' THEN 'Status not completed'
      WHEN DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') THEN 'Before start date'
      WHEN DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') THEN 'After end date'
      ELSE NULL
    END as exclusion_reason
  FROM time_entries te
  JOIN employee_user eu ON te.user_id = eu.user_id
  WHERE 
    te.organization_id = org_id
    -- Show all entries within a wider date range for debugging
    AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') - INTERVAL '7 days'
    AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') + INTERVAL '7 days'
  ORDER BY te.clock_in;
END;
$$;


ALTER FUNCTION "public"."debug_weekly_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid", "employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_time_entries_by_email"("employee_email" "text") RETURNS TABLE("time_entry_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone, "user_id" "uuid", "employee_id" "uuid", "employee_first_name" "text", "employee_last_name" "text", "member_id" "uuid", "organization_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.id as time_entry_id,
        te.start_time,
        te.end_time,
        au.id as user_id,
        e.id as employee_id,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        om.id as member_id,
        e.organization_id
    FROM auth.users au
    JOIN organization_members om ON om.user_id = au.id
    JOIN employees e ON e.member_id = om.id
    LEFT JOIN time_entries te ON te.user_id = au.id
    WHERE au.email = employee_email
    ORDER BY te.start_time DESC;
END;
$$;


ALTER FUNCTION "public"."get_employee_time_entries_by_email"("employee_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_time_entries_by_user_id"("user_uuid" "uuid") RETURNS TABLE("time_entry_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone, "user_id" "uuid", "employee_id" "uuid", "employee_first_name" "text", "employee_last_name" "text", "member_id" "uuid", "organization_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.id as time_entry_id,
        te.start_time,
        te.end_time,
        au.id as user_id,
        e.id as employee_id,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        om.id as member_id,
        e.organization_id
    FROM auth.users au
    JOIN organization_members om ON om.user_id = au.id
    JOIN employees e ON e.member_id = om.id
    LEFT JOIN time_entries te ON te.user_id = au.id
    WHERE au.id = user_uuid
    ORDER BY te.start_time DESC;
END;
$$;


ALTER FUNCTION "public"."get_employee_time_entries_by_user_id"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_subscription"("org_id" "uuid") RETURNS TABLE("subscription_id" "uuid", "plan_id" "uuid", "plan_name" "text", "plan_type" "text", "status" "text", "billing_cycle" "text", "current_period_end" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS subscription_id,
    s.plan_id,
    p.name AS plan_name,
    p.type AS plan_type,
    s.status,
    s.billing_cycle,
    s.current_period_end
  FROM 
    subscriptions s
  JOIN 
    subscription_plans p ON s.plan_id = p.id
  WHERE 
    s.organization_id = org_id
  ORDER BY 
    s.created_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_organization_subscription"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weekly_employee_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid") RETURNS SETOF "public"."weekly_hours_result"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user has access to organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this organization''s data';
  END IF;

  -- Return data for the organization and date range
  RETURN QUERY
  WITH filtered_time_entries AS (
    SELECT 
      te.user_id,
      te.organization_id,
      te.job_location_id,
      te.status,
      DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') as entry_date,
      ROUND(
        (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600 - COALESCE(te.total_break_minutes, 0)/60.0)::numeric,
        2
      ) as worked_hours,
      te.service_type,
      -- Join with service_types to get the name
      st.name as service_type_name
    FROM time_entries te
    LEFT JOIN service_types st ON te.service_type = st.id
    WHERE
      te.organization_id = org_id
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') >= DATE(start_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
      AND DATE(te.clock_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') < DATE(end_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')
      AND te.clock_out IS NOT NULL
  ),
  weekly_totals AS (
    -- Calculate weekly totals for each employee
    SELECT 
      user_id,
      DATE_TRUNC('week', entry_date) as week_start,
      ROUND(COALESCE(SUM(worked_hours), 0)::numeric, 2) as week_total
    FROM filtered_time_entries
    GROUP BY user_id, DATE_TRUNC('week', entry_date)
  )
  SELECT
    e.id,
    e.first_name || ' ' || e.last_name as name,
    e.organization_id,
    -- Include job location array
    ARRAY_AGG(DISTINCT fte.job_location_id) FILTER (WHERE fte.job_location_id IS NOT NULL) as job_location_ids,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 1 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as monday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 2 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as tuesday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 3 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as wednesday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 4 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as thursday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 5 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as friday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 6 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as saturday,
    ROUND(COALESCE(SUM(CASE WHEN to_char(fte.entry_date, 'ID')::integer = 7 THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as sunday,
    -- Calculate total regular hours (capped at 40 per week)
    ROUND(COALESCE(SUM(
      CASE
        WHEN wt.week_total <= 40 THEN fte.worked_hours
        ELSE ROUND((fte.worked_hours * 40.0 / wt.week_total)::numeric, 2)
      END
    ), 0)::numeric, 2) as total_regular,
    -- Calculate overtime (hours over 40 per week)
    ROUND(COALESCE(SUM(
      CASE
        WHEN wt.week_total > 40 THEN ROUND((fte.worked_hours * (wt.week_total - 40.0) / wt.week_total)::numeric, 2)
        ELSE 0
      END
    ), 0)::numeric, 2) as total_ot,
    -- Use service_type_name instead of direct comparison with UUID
    ROUND(COALESCE(SUM(CASE WHEN LOWER(fte.service_type_name) = 'vacation' THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as vacation_hours,
    ROUND(COALESCE(SUM(CASE WHEN LOWER(fte.service_type_name) = 'sick' THEN fte.worked_hours ELSE 0 END), 0)::numeric, 2) as sick_leave_hours,
    -- Calculate total vacation allocation
    ROUND((
      COALESCE((e.pto->'vacation'->>'beginningBalance')::numeric, 0) + 
      COALESCE((e.pto->'vacation'->>'ongoingBalance')::numeric, 0) +
      -- Add base allocation based on start date
      CASE 
        WHEN DATE_PART('year', AGE(CURRENT_DATE, e.start_date::date)) < 1 THEN
          -- First year: Pro-rate 40 hours based on months worked
          FLOOR(40 * DATE_PART('month', AGE(CURRENT_DATE, e.start_date::date)) / 12)
        ELSE 
          -- Second year onwards: 80 hours
          80
      END
    )::numeric, 2) as vacation_balance,
    -- Calculate available sick leave balance
    COALESCE((e.pto->'sickLeave'->>'beginningBalance')::numeric, 0) - 
    COALESCE((e.pto->'sickLeave'->>'used')::numeric, 0) as sick_leave_balance
  FROM 
    employees e
    INNER JOIN organization_members om ON e.member_id = om.id
    LEFT JOIN filtered_time_entries fte ON om.user_id = fte.user_id
    LEFT JOIN weekly_totals wt ON fte.user_id = wt.user_id 
      AND DATE_TRUNC('week', fte.entry_date) = wt.week_start
    AND fte.organization_id = e.organization_id
  WHERE e.organization_id = org_id
  GROUP BY 
    e.id, e.first_name, e.last_name, e.organization_id, om.user_id, e.pto, e.start_date;
END;
$$;


ALTER FUNCTION "public"."get_weekly_employee_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_employee_photo_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  storage_path TEXT;
BEGIN
  -- If photo_url is being changed and old photo exists
  IF (OLD.photo_url IS DISTINCT FROM NEW.photo_url) AND OLD.photo_url IS NOT NULL THEN
    -- Extract storage path from URL
    storage_path := substring(OLD.photo_url from 'employee-photos/(.*)');
    
    -- Delete old photo from storage if it exists
    IF storage_path IS NOT NULL THEN
      BEGIN
        DELETE FROM storage.objects
        WHERE bucket_id = 'employee-photos'
        AND name = storage_path;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the update
        RAISE WARNING 'Failed to delete old photo: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_employee_photo_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_empty_review_notes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Convert empty review_notes to null
    IF NEW.review_notes = '' THEN
        NEW.review_notes = NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_empty_review_notes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_subscription_plan"("plan_data" "jsonb") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "type" "text", "monthly_price" numeric, "annual_price" numeric, "features" "jsonb", "is_custom" boolean, "is_active" boolean, "stripe_product_id" "text", "stripe_monthly_price_id" "text", "stripe_annual_price_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_plan RECORD;
BEGIN
  -- Insert the subscription plan using a WITH clause to avoid ambiguity
  WITH inserted AS (
    INSERT INTO public.subscription_plans (
      name,
      description,
      type,
      monthly_price,
      annual_price,
      features,
      is_custom,
      is_active,
      stripe_product_id,
      stripe_monthly_price_id,
      stripe_annual_price_id
    )
    VALUES (
      plan_data->>'name',
      plan_data->>'description',
      plan_data->>'type',
      (plan_data->>'monthly_price')::numeric,
      (plan_data->>'annual_price')::numeric,
      plan_data->'features',
      (plan_data->>'is_custom')::boolean,
      (plan_data->>'is_active')::boolean,
      plan_data->>'stripe_product_id',
      plan_data->>'stripe_monthly_price_id',
      plan_data->>'stripe_annual_price_id'
    )
    RETURNING *
  )
  SELECT * INTO new_plan FROM inserted;
  
  -- Return the new plan
  RETURN QUERY
  SELECT 
    new_plan.id,
    new_plan.name,
    new_plan.description,
    new_plan.type,
    new_plan.monthly_price,
    new_plan.annual_price,
    new_plan.features,
    new_plan.is_custom,
    new_plan.is_active,
    new_plan.stripe_product_id,
    new_plan.stripe_monthly_price_id,
    new_plan.stripe_annual_price_id;
END;
$$;


ALTER FUNCTION "public"."insert_subscription_plan"("plan_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE super_admins.user_id = $1
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$_$;


ALTER FUNCTION "public"."is_super_admin"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_super_admin"("user_id" "uuid") IS 'Function to check if a user has super admin privileges';



CREATE OR REPLACE FUNCTION "public"."log_rls_check"("check_name" "text", "result" boolean) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO rls_debug_log (check_name, check_result, check_time)
  VALUES (check_name, result, now());
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."log_rls_check"("check_name" "text", "result" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_string"("input" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- Convert to lowercase and trim
  RETURN lower(trim(COALESCE(input, '')));
END;
$$;


ALTER FUNCTION "public"."normalize_string"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_admin_members"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.admin_members;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_admin_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_organization_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY organization_access;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_organization_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_test_organizations"("test_org_ids" "uuid"[], "batch_size" integer DEFAULT 1000) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cleanup_id UUID;
    affected_count INTEGER;
    total_count INTEGER;
    current_batch INTEGER;
    batch_ids UUID[];
BEGIN
    -- Create cleanup log entry
    INSERT INTO public.cleanup_logs (
        operation,
        affected_tables,
        status,
        created_by
    )
    VALUES (
        'remove_test_organizations',
        ARRAY['organizations', 'subscriptions', 'organization_members', 'employees', 'time_entries', 'job_locations', 'pto_requests'],
        'started',
        current_user
    )
    RETURNING id INTO cleanup_id;
    
    -- Create backups
    PERFORM public.create_test_data_backups(test_org_ids, cleanup_id);
    
    -- Delete related records in batches using CTEs
    -- Organization metrics
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.organization_metrics
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.organization_metrics
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- API keys
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.api_keys
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.api_keys
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- PTO requests
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.pto_requests
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.pto_requests
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Time entries
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.time_entries
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.time_entries
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Job locations
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.job_locations
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.job_locations
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Organization invites
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.organization_invites
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.organization_invites
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Employees (must be deleted before organization_members due to foreign key constraint)
    DELETE FROM public.employees
    WHERE member_id IN (
        SELECT id
        FROM public.organization_members
        WHERE organization_id = ANY(test_org_ids)
    );
    
    -- Organization members
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.organization_members
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.organization_members
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Subscriptions (must be deleted before organizations due to foreign key constraint)
    DELETE FROM public.subscriptions
    WHERE organization_id = ANY(test_org_ids);
    
    -- Finally, delete organizations
    DELETE FROM public.organizations
    WHERE id = ANY(test_org_ids);
    
    -- Update cleanup log
    UPDATE public.cleanup_logs
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = cleanup_id;

EXCEPTION WHEN OTHERS THEN
    -- Update cleanup log with error
    UPDATE public.cleanup_logs
    SET status = 'failed',
        error_message = SQLERRM,
        completed_at = NOW()
    WHERE id = cleanup_id;
    
    RAISE EXCEPTION 'Cleanup failed: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."remove_test_organizations"("test_org_ids" "uuid"[], "batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_test_users"("batch_size" integer DEFAULT 1000) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cleanup_id UUID;
    affected_count INTEGER;
    total_count INTEGER;
    current_batch INTEGER;
    test_user_ids UUID[];
BEGIN
    -- Identify users who are not employees (not in organization_members)
    SELECT ARRAY_AGG(u.id)
    INTO test_user_ids
    FROM auth.users u
    LEFT JOIN (
        SELECT DISTINCT user_id::UUID
        FROM public.organization_members
    ) om ON u.id = om.user_id
    WHERE om.user_id IS NULL;
    
    -- If no test users found, exit early
    IF test_user_ids IS NULL OR array_length(test_user_ids, 1) = 0 THEN
        RAISE NOTICE 'No test users found to delete';
        RETURN;
    END IF;
    
    -- Create cleanup log entry
    INSERT INTO public.user_cleanup_logs (
        operation,
        affected_tables,
        status,
        created_by,
        record_counts
    )
    VALUES (
        'remove_test_users',
        ARRAY['auth.users', 'auth.identities', 'auth.sessions', 'auth.mfa_factors', 'auth.mfa_challenges', 'auth.refresh_tokens'],
        'started',
        current_user,
        jsonb_build_object('users_count', array_length(test_user_ids, 1))
    )
    RETURNING id INTO cleanup_id;
    
    -- Create backups
    PERFORM public.create_test_user_backups(test_user_ids, cleanup_id);
    
    -- Convert UUID array to a comma-separated string of quoted UUIDs for deletion
    DECLARE
        user_id_list TEXT;
    BEGIN
        SELECT string_agg(quote_literal(id::TEXT), ',') INTO user_id_list FROM unnest(test_user_ids) AS id;
        
        -- Delete related records using explicit IN clause with text comparison
        -- First, delete records from auth.mfa_challenges that reference auth.mfa_factors
        BEGIN
            EXECUTE format(
                'WITH mfa_factor_ids AS (
                    SELECT id
                    FROM auth.mfa_factors
                    WHERE user_id::TEXT IN (%s)
                )
                DELETE FROM auth.mfa_challenges
                WHERE factor_id IN (SELECT id FROM mfa_factor_ids)',
                user_id_list
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.mfa_challenges: %', SQLERRM;
            RAISE;
        END;
        
        -- Delete records from auth.mfa_factors
        BEGIN
            EXECUTE format(
                'DELETE FROM auth.mfa_factors
                 WHERE user_id::TEXT IN (%s)',
                user_id_list
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.mfa_factors: %', SQLERRM;
            RAISE;
        END;
        
        -- Delete records from auth.refresh_tokens
        BEGIN
            EXECUTE format(
                'DELETE FROM auth.refresh_tokens
                 WHERE user_id::TEXT IN (%s)',
                user_id_list
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.refresh_tokens: %', SQLERRM;
            RAISE;
        END;
        
        -- Delete records from auth.sessions
        BEGIN
            EXECUTE format(
                'DELETE FROM auth.sessions
                 WHERE user_id::TEXT IN (%s)',
                user_id_list
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.sessions: %', SQLERRM;
            RAISE;
        END;
        
        -- Delete records from auth.identities
        BEGIN
            EXECUTE format(
                'DELETE FROM auth.identities
                 WHERE user_id::TEXT IN (%s)',
                user_id_list
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.identities: %', SQLERRM;
            RAISE;
        END;
        
        -- Finally, delete users
        BEGIN
            EXECUTE format(
                'DELETE FROM auth.users
                 WHERE id::TEXT IN (%s)',
                user_id_list
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.users: %', SQLERRM;
            RAISE;
        END;
    END;
    
    -- Update cleanup log
    UPDATE public.user_cleanup_logs
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = cleanup_id;

EXCEPTION WHEN OTHERS THEN
    -- Update cleanup log with error
    UPDATE public.user_cleanup_logs
    SET status = 'failed',
        error_message = SQLERRM,
        completed_at = NOW()
    WHERE id = cleanup_id;
    
    RAISE EXCEPTION 'User cleanup failed: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."remove_test_users"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rollback_test_data_cleanup"("cleanup_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    backup_table TEXT;
    cleanup_record RECORD;
BEGIN
    -- Get cleanup record
    SELECT * INTO cleanup_record
    FROM public.cleanup_logs
    WHERE id = cleanup_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cleanup record not found';
    END IF;
    
    -- Start rollback transaction
    BEGIN
        -- Restore data from each backup table
        FOREACH backup_table IN ARRAY cleanup_record.backup_tables
        LOOP
            EXECUTE format(
                'INSERT INTO public.%I 
                 SELECT * FROM public.%I
                 ON CONFLICT DO NOTHING',
                regexp_replace(backup_table, '_backup_\d+$', ''),
                backup_table
            );
        END LOOP;
        
        -- Log rollback
        INSERT INTO public.cleanup_logs (
            operation,
            affected_tables,
            status,
            created_by
        )
        VALUES (
            'rollback_test_data_cleanup',
            cleanup_record.affected_tables,
            'completed',
            current_user
        );
        
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Rollback failed: %', SQLERRM;
    END;
END;
$_$;


ALTER FUNCTION "public"."rollback_test_data_cleanup"("cleanup_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rollback_test_user_cleanup"("cleanup_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    backup_table TEXT;
    cleanup_record RECORD;
    target_table TEXT;
BEGIN
    -- Get cleanup record
    SELECT * INTO cleanup_record
    FROM public.user_cleanup_logs
    WHERE id = cleanup_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cleanup record not found';
    END IF;
    
    -- Start rollback transaction
    BEGIN
        -- Restore data from each backup table
        FOREACH backup_table IN ARRAY cleanup_record.backup_tables
        LOOP
            -- Extract the target table name from the backup table name
            target_table := regexp_replace(backup_table, '^auth_([^_]+)_backup_\d+$', 'auth.\1');
            
            EXECUTE format(
                'INSERT INTO %s 
                 SELECT * FROM public.%I
                 ON CONFLICT DO NOTHING',
                target_table,
                backup_table
            );
        END LOOP;
        
        -- Log rollback
        INSERT INTO public.user_cleanup_logs (
            operation,
            affected_tables,
            status,
            created_by
        )
        VALUES (
            'rollback_test_user_cleanup',
            cleanup_record.affected_tables,
            'completed',
            current_user
        );
        
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'User rollback failed: %', SQLERRM;
    END;
END;
$_$;


ALTER FUNCTION "public"."rollback_test_user_cleanup"("cleanup_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_initial_break_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Set defaults
    NEW.break_duration := COALESCE(NEW.break_duration, 0);
    NEW.status := COALESCE(NEW.status, 'active');
    
    -- Validate status transitions
    IF TG_OP = 'UPDATE' THEN
        -- When updating from 'break' to 'active', ensure break_duration is set
        IF OLD.status = 'break' AND NEW.status = 'active' AND NEW.break_duration = OLD.break_duration THEN
            NEW.break_duration := COALESCE(OLD.break_duration, 0) + 15;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_initial_break_duration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."setup_initial_super_admin"("admin_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
  
  IF user_id IS NULL THEN
    -- Try to get from the users table if auth.users doesn't work
    SELECT id INTO user_id FROM users WHERE email = admin_email;
    
    IF user_id IS NULL THEN
      RAISE EXCEPTION 'User with email % not found', admin_email;
    END IF;
  END IF;
  
  -- Insert into super_admins table
  INSERT INTO super_admins (user_id, created_by)
  VALUES (user_id, user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."setup_initial_super_admin"("admin_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."setup_initial_super_admin"("admin_email" "text") IS 'Function to set up the initial super admin user';



CREATE OR REPLACE FUNCTION "public"."setup_rls_test_data"() RETURNS TABLE("user_id" "uuid", "org_id" "uuid", "member_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_result RECORD;
BEGIN
  -- Create test organization
  SELECT * INTO v_result
  FROM create_organization_transaction(
    'RLS Test Org',
    'rls-test-org',
    v_user_id,
    NULL
  );

  RETURN QUERY SELECT v_user_id, v_result.organization_id, v_result.member_id;
END;
$$;


ALTER FUNCTION "public"."setup_rls_test_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_organization_setup"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id_1 uuid := gen_random_uuid();
  v_user_id_2 uuid := gen_random_uuid();
  v_org_id uuid;
  v_member_id uuid;
  v_result RECORD;
  v_output text := '';
BEGIN
  -- Test creating first organization
  v_output := v_output || E'\nTesting first organization creation...';
  SELECT organization_id, member_id 
  INTO v_org_id, v_member_id
  FROM create_organization_transaction(
    'Test Organization 1',
    'test-org-1',
    v_user_id_1,
    NULL
  );

  ASSERT v_org_id IS NOT NULL, 'First organization creation failed';
  ASSERT v_member_id IS NOT NULL, 'First member creation failed';
  v_output := v_output || E'\nFirst organization created successfully';

  -- Test creating second organization
  v_output := v_output || E'\nTesting second organization creation...';
  SELECT organization_id, member_id 
  INTO v_org_id, v_member_id
  FROM create_organization_transaction(
    'Test Organization 2',
    'test-org-2',
    v_user_id_2,
    NULL
  );

  ASSERT v_org_id IS NOT NULL, 'Second organization creation failed';
  ASSERT v_member_id IS NOT NULL, 'Second member creation failed';
  v_output := v_output || E'\nSecond organization created successfully';

  -- Check created organizations
  v_output := v_output || E'\nChecking created organizations...';
  FOR v_result IN 
    SELECT o.name, o.slug, m.role
    FROM organizations o
    JOIN organization_members m ON m.organization_id = o.id
    WHERE o.slug IN ('test-org-1', 'test-org-2')
  LOOP
    v_output := v_output || E'\nOrganization: ' || v_result.name || 
                           E', Slug: ' || v_result.slug || 
                           E', Role: ' || v_result.role;
  END LOOP;

  -- Cleanup
  v_output := v_output || E'\nCleaning up test data...';
  DELETE FROM organization_members WHERE user_id IN (v_user_id_1, v_user_id_2);
  DELETE FROM organizations WHERE slug IN ('test-org-1', 'test-org-2');

  v_output := v_output || E'\nAll tests completed successfully';
  RETURN v_output;
END;
$$;


ALTER FUNCTION "public"."test_organization_setup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_organization_visibility"("test_user_id" "uuid") RETURNS TABLE("organizations_visible" integer, "members_visible" integer, "invites_visible" integer, "time_entries_visible" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_ids UUID[];
BEGIN
  -- Get organizations where user is a member
  SELECT array_agg(organization_id) INTO v_org_ids
  FROM organization_members
  WHERE user_id = test_user_id;

  -- Count records visible to user
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM organizations WHERE id = ANY(v_org_ids)),
    (SELECT COUNT(*)::INT FROM organization_members WHERE organization_id = ANY(v_org_ids)),
    (SELECT COUNT(*)::INT FROM organization_invites WHERE organization_id = ANY(v_org_ids)),
    (SELECT COUNT(*)::INT FROM time_entries WHERE organization_id = ANY(v_org_ids));
END;
$$;


ALTER FUNCTION "public"."test_organization_visibility"("test_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_subscription_plan_activation"("plan_id" "uuid", "current_status" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB;
BEGIN
  -- Toggle the activation status
  UPDATE public.subscription_plans
  SET is_active = NOT current_status
  WHERE id = plan_id
  RETURNING to_jsonb(subscription_plans) INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."toggle_subscription_plan_activation"("plan_id" "uuid", "current_status" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "member_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "department" "text",
    "start_date" "date" NOT NULL,
    "pto" "jsonb" DEFAULT '{"vacation": {"used": 0, "firstYearRule": 40, "ongoingBalance": 0, "beginningBalance": 0}, "sickLeave": {"used": 0, "beginningBalance": 0}}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "photo_url" "text",
    CONSTRAINT "employees_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'employee'::"text"]))),
    CONSTRAINT "employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee_basic_info"("employee_id" "uuid", "new_first_name" "text" DEFAULT NULL::"text", "new_last_name" "text" DEFAULT NULL::"text", "new_email" "text" DEFAULT NULL::"text", "new_phone" "text" DEFAULT NULL::"text", "new_department" "text" DEFAULT NULL::"text", "new_start_date" "date" DEFAULT NULL::"date", "new_role" "text" DEFAULT NULL::"text", "new_status" "text" DEFAULT NULL::"text", "new_pto" "jsonb" DEFAULT NULL::"jsonb") RETURNS SETOF "public"."employees"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user has permission (admin or manager)
    IF NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
        AND (
            -- Admin can update any employee
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
            OR
            -- Manager can update organization employees
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'manager'
            )
        )
    ) THEN
        RAISE EXCEPTION 'Permission denied: Only admins or managers can update employee information';
    END IF;

    -- Update the employee record with non-null values
    RETURN QUERY
    UPDATE employees
    SET
        first_name = COALESCE(new_first_name, first_name),
        last_name = COALESCE(new_last_name, last_name),
        email = COALESCE(new_email, email),
        phone = COALESCE(new_phone, phone),
        department = COALESCE(new_department, department),
        start_date = COALESCE(new_start_date, start_date),
        role = COALESCE(new_role, role),
        status = COALESCE(new_status, status),
        pto = COALESCE(new_pto, pto),
        updated_at = NOW()
    WHERE id = employee_id
    RETURNING *;
END;
$$;


ALTER FUNCTION "public"."update_employee_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_department" "text", "new_start_date" "date", "new_role" "text", "new_status" "text", "new_pto" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee_pto"("employee_id" "uuid", "new_pto" "jsonb") RETURNS SETOF "public"."employees"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- First check if employee exists
    IF NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
    ) THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;

    -- Then check if user has permission (admin, manager, or the employee themselves)
    IF NOT EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = employee_id
        AND (
            -- Admin can update any employee's PTO
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
            OR
            -- Manager can update their organization's employee PTO
            e.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
                AND role = 'manager'
            )
            OR
            -- Employee can update their own PTO
            e.member_id IN (
                SELECT id
                FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    ) THEN
        RAISE EXCEPTION 'Permission denied: Only admins, managers, or the employee themselves can update PTO settings';
    END IF;

    -- Update and return the updated record
    RETURN QUERY
    UPDATE public.employees
    SET
        pto = new_pto,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = employee_id
    RETURNING *;
END;
$$;


ALTER FUNCTION "public"."update_employee_pto"("employee_id" "uuid", "new_pto" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_plan_stripe_ids"("p_id" "uuid", "p_product_id" "text", "p_monthly_price_id" "text", "p_annual_price_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.subscription_plans
  SET 
    stripe_product_id = p_product_id,
    stripe_monthly_price_id = p_monthly_price_id,
    stripe_annual_price_id = p_annual_price_id
  WHERE id = p_id;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_plan_stripe_ids"("p_id" "uuid", "p_product_id" "text", "p_monthly_price_id" "text", "p_annual_price_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_types_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_service_types_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscription_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_plan"("plan_id" "uuid", "plan_data" "jsonb") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "type" "text", "monthly_price" numeric, "annual_price" numeric, "features" "jsonb", "is_custom" boolean, "is_active" boolean, "stripe_product_id" "text", "stripe_monthly_price_id" "text", "stripe_annual_price_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_plan RECORD;
BEGIN
  -- Update the subscription plan using a WITH clause to avoid ambiguity
  WITH updated AS (
    UPDATE public.subscription_plans AS sp
    SET 
      name = COALESCE(plan_data->>'name', sp.name),
      description = COALESCE(plan_data->>'description', sp.description),
      type = COALESCE(plan_data->>'type', sp.type),
      monthly_price = COALESCE((plan_data->>'monthly_price')::numeric, sp.monthly_price),
      annual_price = COALESCE((plan_data->>'annual_price')::numeric, sp.annual_price),
      features = COALESCE(plan_data->'features', sp.features),
      is_custom = COALESCE((plan_data->>'is_custom')::boolean, sp.is_custom),
      is_active = COALESCE((plan_data->>'is_active')::boolean, sp.is_active),
      stripe_product_id = COALESCE(plan_data->>'stripe_product_id', sp.stripe_product_id),
      stripe_monthly_price_id = COALESCE(plan_data->>'stripe_monthly_price_id', sp.stripe_monthly_price_id),
      stripe_annual_price_id = COALESCE(plan_data->>'stripe_annual_price_id', sp.stripe_annual_price_id)
    WHERE sp.id = plan_id
    RETURNING *
  )
  SELECT * INTO updated_plan FROM updated;
  
  -- Return the updated plan
  RETURN QUERY
  SELECT 
    updated_plan.id,
    updated_plan.name,
    updated_plan.description,
    updated_plan.type,
    updated_plan.monthly_price,
    updated_plan.annual_price,
    updated_plan.features,
    updated_plan.is_custom,
    updated_plan.is_active,
    updated_plan.stripe_product_id,
    updated_plan.stripe_monthly_price_id,
    updated_plan.stripe_annual_price_id;
END;
$$;


ALTER FUNCTION "public"."update_subscription_plan"("plan_id" "uuid", "plan_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_plan_stripe_ids"("plan_id" "uuid", "product_id" "text", "monthly_price_id" "text", "annual_price_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.subscription_plans
  SET 
    stripe_product_id = product_id,
    stripe_monthly_price_id = monthly_price_id,
    stripe_annual_price_id = annual_price_id
  WHERE id = plan_id;
END;
$$;


ALTER FUNCTION "public"."update_subscription_plan_stripe_ids"("plan_id" "uuid", "product_id" "text", "monthly_price_id" "text", "annual_price_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timesheet_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only update timesheet hours if the timesheet is in 'pending' status
  UPDATE timesheets
  SET total_hours = (
    SELECT COALESCE(SUM(
      EXTRACT(EPOCH FROM (end_time - start_time))/3600 - 
      COALESCE(break_duration, 0)/60
    ), 0)
    FROM time_entries
    WHERE timesheet_id = NEW.timesheet_id
    AND end_time IS NOT NULL
  )
  WHERE id = NEW.timesheet_id
  AND status = 'pending';
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timesheet_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timesheet_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update relevant timesheet total
    UPDATE timesheets
    SET total_hours = (
        SELECT COALESCE(SUM(
            calculate_hours(start_time, end_time, break_duration)
        ), 0)
        FROM time_entries
        WHERE employee_id = NEW.employee_id
        AND entry_date BETWEEN timesheets.period_start_date AND timesheets.period_end_date
    )
    WHERE employee_id = NEW.employee_id
    AND period_start_date <= NEW.entry_date
    AND period_end_date >= NEW.entry_date;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timesheet_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_basic_info"("employee_id" "uuid", "new_first_name" "text" DEFAULT NULL::"text", "new_last_name" "text" DEFAULT NULL::"text", "new_email" "text" DEFAULT NULL::"text", "new_phone" "text" DEFAULT NULL::"text", "new_photo_url" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."employees"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_employee employees%ROWTYPE;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Get the target employee record
  SELECT * INTO target_employee
  FROM employees e
  INNER JOIN organization_members om ON e.member_id = om.id
  WHERE e.id = employee_id;
  
  -- Check if employee exists
  IF target_employee.id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  -- Check if current user is the owner of this employee record
  IF NOT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.id = target_employee.member_id
    AND om.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: Users can only update their own information';
  END IF;

  -- Update employee record
  UPDATE employees
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    phone = COALESCE(new_phone, phone),
    photo_url = new_photo_url,
    updated_at = NOW()
  WHERE id = employee_id
  RETURNING * INTO target_employee;

  RETURN NEXT target_employee;
END;
$$;


ALTER FUNCTION "public"."update_user_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_photo_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_organization_invite"("p_invite_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invite record;
  v_org record;
BEGIN
  -- Get invite details with organization name
  SELECT 
    i.*,
    o.name as organization_name
  INTO v_invite
  FROM organization_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.id = p_invite_id;

  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite not found'
    );
  END IF;

  -- Check invite status
  IF v_invite.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 
      CASE v_invite.status
        WHEN 'accepted' THEN 'This invite has already been used'
        WHEN 'expired' THEN 'This invite has expired'
        WHEN 'revoked' THEN 'This invite has been revoked'
        ELSE 'This invite is no longer valid'
      END
    );
  END IF;

  -- Check if invite is expired
  IF v_invite.expires_at < now() THEN
    -- Update status to expired
    UPDATE organization_invites
    SET status = 'expired'
    WHERE id = p_invite_id;

    RETURN json_build_object(
      'success', false,
      'error', 'This invite has expired'
    );
  END IF;

  -- Return invite details
  RETURN json_build_object(
    'success', true,
    'invite', json_build_object(
      'email', v_invite.email,
      'organization_name', v_invite.organization_name,
      'expires_at', v_invite.expires_at,
      'status', v_invite.status
    )
  );
END;
$$;


ALTER FUNCTION "public"."validate_organization_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_test_data_removal"("test_org_ids" "uuid"[]) RETURNS TABLE("table_name" "text", "record_count" bigint, "validation_passed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 'organizations'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) > 0
    FROM public.organizations
    WHERE id = ANY(test_org_ids)
    UNION ALL
    SELECT 'organization_members'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = (
               SELECT COUNT(*)
               FROM public.organization_members
               WHERE organization_id = ANY(test_org_ids)
           )
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE o.id = ANY(test_org_ids)
    UNION ALL
    SELECT 'time_entries'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = (
               SELECT COUNT(*)
               FROM public.time_entries
               WHERE organization_id = ANY(test_org_ids)
           )
    FROM public.time_entries te
    JOIN public.organizations o ON o.id = te.organization_id
    WHERE o.id = ANY(test_org_ids);
END;
$$;


ALTER FUNCTION "public"."validate_test_data_removal"("test_org_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_test_user_removal"() RETURNS TABLE("table_name" "text", "record_count" bigint, "validation_passed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    non_employee_user_ids UUID[];
BEGIN
    -- Identify users who are not employees (not in organization_members)
    SELECT ARRAY_AGG(u.id)
    INTO non_employee_user_ids
    FROM auth.users u
    LEFT JOIN (
        SELECT DISTINCT user_id::UUID
        FROM public.organization_members
    ) om ON u.id = om.user_id
    WHERE om.user_id IS NULL;
    
    -- If no non-employee users found, all validations pass
    IF non_employee_user_ids IS NULL OR array_length(non_employee_user_ids, 1) = 0 THEN
        RETURN QUERY
        SELECT 'auth.users'::TEXT, 0::BIGINT, TRUE
        UNION ALL
        SELECT 'auth.identities'::TEXT, 0::BIGINT, TRUE
        UNION ALL
        SELECT 'auth.sessions'::TEXT, 0::BIGINT, TRUE;
        RETURN;
    END IF;
    
    -- Otherwise, check if any non-employee users still exist
    RETURN QUERY
    SELECT 'auth.users'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = 0
    FROM auth.users
    WHERE id = ANY(non_employee_user_ids)
    UNION ALL
    SELECT 'auth.identities'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = 0
    FROM auth.identities
    WHERE user_id = ANY(non_employee_user_ids)
    UNION ALL
    SELECT 'auth.sessions'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = 0
    FROM auth.sessions
    WHERE user_id = ANY(non_employee_user_ids);
END;
$$;


ALTER FUNCTION "public"."validate_test_user_removal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_time_entry_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    entry_week_start DATE;
    timesheet_week DATE;
BEGIN
    -- Get the week start date (Sunday) for the time entry
    entry_week_start := NEW.start_time::date - EXTRACT(DOW FROM NEW.start_time::date)::integer;
    
    -- Get the timesheet week
    SELECT week_start_date INTO timesheet_week
    FROM timesheets
    WHERE id = NEW.timesheet_id;
    
    -- Handle case where timesheet doesn't exist
    IF timesheet_week IS NULL THEN
        RAISE EXCEPTION 'Referenced timesheet does not exist';
    END IF;
    
    -- Ensure dates match
    IF entry_week_start != timesheet_week THEN
        RAISE EXCEPTION 'Time entry dates must be within the timesheet week. Entry week starts %, timesheet week starts %', 
            entry_week_start, timesheet_week;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_time_entry_dates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_timesheet_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only allow specific status transitions
    IF OLD.status = 'pending' AND NEW.status NOT IN ('submitted', 'pending') THEN
        RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
    END IF;
    
    IF OLD.status = 'submitted' AND NEW.status NOT IN ('approved', 'rejected', 'submitted') THEN
        RAISE EXCEPTION 'Invalid status transition from submitted to %', NEW.status;
    END IF;
    
    IF OLD.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
        RAISE EXCEPTION 'Cannot change status once timesheet is % status', OLD.status;
    END IF;

    -- Set timestamps based on status changes
    IF NEW.status = 'submitted' AND OLD.status = 'pending' THEN
        NEW.submitted_at = NOW();
    END IF;

    IF NEW.status = 'approved' AND OLD.status = 'submitted' THEN
        NEW.reviewed_at = NOW();
        NEW.reviewed_by = auth.uid(); -- Set the reviewer
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_timesheet_status_transition"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'employee'::"public"."user_role" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."admin_members" AS
 SELECT DISTINCT "organization_members"."organization_id",
    "organization_members"."user_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."role" = 'admin'::"public"."user_role")
  WITH NO DATA;


ALTER TABLE "public"."admin_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "scope" "text"[] DEFAULT '{}'::"text"[],
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_identities_backup_20250318_032734" (
    "provider_id" "text",
    "user_id" "uuid",
    "identity_data" "jsonb",
    "provider" "text",
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text",
    "id" "uuid"
);


ALTER TABLE "public"."auth_identities_backup_20250318_032734" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_mfa_challenges_backup_20250318_032734" (
    "id" "uuid",
    "factor_id" "uuid",
    "created_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "ip_address" "inet",
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "public"."auth_mfa_challenges_backup_20250318_032734" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_mfa_factors_backup_20250318_032734" (
    "id" "uuid",
    "user_id" "uuid",
    "friendly_name" "text",
    "factor_type" "auth"."factor_type",
    "status" "auth"."factor_status",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid"
);


ALTER TABLE "public"."auth_mfa_factors_backup_20250318_032734" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_refresh_tokens_backup_20250318_032734" (
    "instance_id" "uuid",
    "id" bigint,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "public"."auth_refresh_tokens_backup_20250318_032734" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_sessions_backup_20250318_032734" (
    "id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text"
);


ALTER TABLE "public"."auth_sessions_backup_20250318_032734" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_users_backup_20250318_032734" (
    "instance_id" "uuid",
    "id" "uuid",
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text",
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text",
    "phone_change_token" character varying(255),
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "email_change_token_current" character varying(255),
    "email_change_confirm_status" smallint,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255),
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean
);


ALTER TABLE "public"."auth_users_backup_20250318_032734" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleanup_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "operation" "text" NOT NULL,
    "affected_tables" "text"[],
    "record_counts" "jsonb",
    "status" "text",
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_by" "text",
    "backup_tables" "text"[]
);


ALTER TABLE "public"."cleanup_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clock_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "time_entry_id" "uuid" NOT NULL,
    "clock_in" timestamp with time zone NOT NULL,
    "clock_out" timestamp with time zone,
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clock_events_type_check" CHECK (("type" = ANY (ARRAY['clock'::"text", 'break'::"text", 'lunch'::"text"])))
);


ALTER TABLE "public"."clock_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_plan_metadata" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "justification" "text",
    "renewal_strategy" character varying(50),
    "next_review_date" timestamp with time zone,
    "migration_path" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" character varying(255),
    "special_terms" "text"
);


ALTER TABLE "public"."custom_plan_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "service_type" "uuid",
    CONSTRAINT "job_locations_type_check" CHECK (("type" = ANY (ARRAY['commercial'::"text", 'residential'::"text"])))
);


ALTER TABLE "public"."job_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_locations" IS 'Stores information about job locations/sites where work is performed';



COMMENT ON COLUMN "public"."job_locations"."type" IS 'Type of location: commercial or residential';



COMMENT ON COLUMN "public"."job_locations"."is_active" IS 'Whether this location is currently active and available for time entries';



CREATE TABLE IF NOT EXISTS "public"."organization_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "organization_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."organization_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "active_users" integer DEFAULT 0,
    "time_entries" integer DEFAULT 0,
    "storage_used" bigint DEFAULT 0,
    "api_calls" integer DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "branding" "jsonb" DEFAULT '{"logo_url": null, "favicon_url": null, "company_name": null, "primary_color": "#3b82f6", "company_website": null, "secondary_color": "#1e40af"}'::"jsonb",
    "billing_email" "text",
    "billing_name" "text",
    "billing_address" "jsonb",
    "tax_id" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "stripe_payment_method_id" "text",
    "type" "text",
    "is_default" boolean DEFAULT false,
    "last_four" "text",
    "expiry_month" integer,
    "expiry_year" integer,
    "card_brand" "text",
    "billing_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pto_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "hours" numeric NOT NULL,
    "created_by" "uuid" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "notes" "text",
    CONSTRAINT "pto_requests_type_check" CHECK (("type" = ANY (ARRAY['vacation'::"text", 'sick_leave'::"text"])))
);


ALTER TABLE "public"."pto_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pto_requests"."reason" IS 'Reason provided for the PTO request';



COMMENT ON COLUMN "public"."pto_requests"."hours" IS 'Number of hours requested for PTO';



COMMENT ON COLUMN "public"."pto_requests"."created_by" IS 'Reference to the user who created the request';



CREATE TABLE IF NOT EXISTS "public"."rls_debug_log" (
    "id" integer NOT NULL,
    "check_name" "text",
    "check_result" boolean,
    "check_time" timestamp with time zone,
    "auth_user_id" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."rls_debug_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."rls_debug_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."rls_debug_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rls_debug_log_id_seq" OWNED BY "public"."rls_debug_log"."id";



CREATE TABLE IF NOT EXISTS "public"."service_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."service_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notification_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscription_events_notification_status_check" CHECK (("notification_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_events" IS 'Tracks subscription-related events and notification status for organizations';



COMMENT ON COLUMN "public"."subscription_events"."event_type" IS 'Type of subscription event (e.g., payment_succeeded, trial_ending)';



COMMENT ON COLUMN "public"."subscription_events"."event_data" IS 'JSON data containing event-specific details';



COMMENT ON COLUMN "public"."subscription_events"."notification_status" IS 'Status of notification delivery (pending, sent, failed)';



COMMENT ON COLUMN "public"."subscription_events"."error_message" IS 'Error message if notification failed';



COMMENT ON COLUMN "public"."subscription_events"."sent_at" IS 'Timestamp when notification was successfully sent';



CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "is_custom" boolean DEFAULT false,
    "parent_plan_id" "uuid",
    "monthly_price" numeric(10,2),
    "annual_price" numeric(10,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "stripe_product_id" "text",
    "stripe_monthly_price_id" "text",
    "stripe_annual_price_id" "text",
    "max_users" integer,
    "min_users" integer,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "effective_per_user_price" numeric(10,2),
    "discount_percentage" numeric(5,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "stripe_invoice_id" "text",
    "stripe_payment_intent_id" "text",
    "amount" numeric(10,2),
    "currency" "text",
    "status" "text",
    "billing_reason" "text",
    "invoice_pdf_url" "text",
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "billing_cycle" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."super_admins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."super_admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."super_admins" IS 'Table to store users with super admin privileges';



CREATE TABLE IF NOT EXISTS "public"."test_user_ids" (
    "array_agg" "uuid"[]
);


ALTER TABLE "public"."test_user_ids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "job_location_id" "uuid" NOT NULL,
    "clock_in" timestamp with time zone NOT NULL,
    "clock_out" timestamp with time zone,
    "break_start" timestamp with time zone,
    "break_end" timestamp with time zone,
    "total_break_minutes" integer DEFAULT 0,
    "work_description" "text" NOT NULL,
    "status" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "service_type" "uuid",
    CONSTRAINT "time_entries_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'break'::"text", 'completed'::"text"]))),
    CONSTRAINT "valid_break_times" CHECK (((("break_start" IS NULL) AND ("break_end" IS NULL)) OR (("break_start" IS NOT NULL) AND ("break_end" IS NULL)) OR (("break_start" IS NOT NULL) AND ("break_end" IS NOT NULL) AND ("break_end" > "break_start")))),
    CONSTRAINT "valid_clock_times" CHECK ((("clock_out" IS NULL) OR ("clock_out" > "clock_in")))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timesheets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "period_start_date" "date" NOT NULL,
    "period_end_date" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "total_hours" numeric(10,2) DEFAULT 0,
    "submitted_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "timesheet_dates_check" CHECK (("period_end_date" >= "period_start_date")),
    CONSTRAINT "timesheets_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."timesheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_cleanup_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "operation" "text" NOT NULL,
    "affected_tables" "text"[],
    "record_counts" "jsonb",
    "status" "text",
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_by" "text",
    "backup_tables" "text"[]
);


ALTER TABLE "public"."user_cleanup_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."rls_debug_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rls_debug_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleanup_logs"
    ADD CONSTRAINT "cleanup_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clock_events"
    ADD CONSTRAINT "clock_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_plan_metadata"
    ADD CONSTRAINT "custom_plan_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_organization_id_key" UNIQUE ("name", "organization_id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_org_key" UNIQUE ("email", "organization_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_locations"
    ADD CONSTRAINT "job_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_metrics"
    ADD CONSTRAINT "organization_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pto_requests"
    ADD CONSTRAINT "pto_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rls_debug_log"
    ADD CONSTRAINT "rls_debug_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_types"
    ADD CONSTRAINT "service_types_name_organization_id_key" UNIQUE ("name", "organization_id");



ALTER TABLE ONLY "public"."service_types"
    ADD CONSTRAINT "service_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_transactions"
    ADD CONSTRAINT "subscription_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."super_admins"
    ADD CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."super_admins"
    ADD CONSTRAINT "super_admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheet_period_unique" UNIQUE ("employee_id", "period_start_date");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cleanup_logs"
    ADD CONSTRAINT "user_cleanup_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "auth_identities_backup_20250318_032734_user_id_idx" ON "public"."auth_identities_backup_20250318_032734" USING "btree" ("user_id");



CREATE INDEX "auth_mfa_factors_backup_20250318_032734_user_id_idx" ON "public"."auth_mfa_factors_backup_20250318_032734" USING "btree" ("user_id");



CREATE INDEX "auth_refresh_tokens_backup_20250318_032734_user_id_idx" ON "public"."auth_refresh_tokens_backup_20250318_032734" USING "btree" ("user_id");



CREATE INDEX "auth_sessions_backup_20250318_032734_user_id_idx" ON "public"."auth_sessions_backup_20250318_032734" USING "btree" ("user_id");



CREATE INDEX "auth_users_backup_20250318_032734_id_idx" ON "public"."auth_users_backup_20250318_032734" USING "btree" ("id");



CREATE UNIQUE INDEX "idx_admin_members" ON "public"."admin_members" USING "btree" ("organization_id", "user_id");



CREATE INDEX "idx_api_keys_org" ON "public"."api_keys" USING "btree" ("organization_id");



CREATE INDEX "idx_custom_plan_metadata_client" ON "public"."custom_plan_metadata" USING "btree" ("client_id");



CREATE INDEX "idx_custom_plan_metadata_plan" ON "public"."custom_plan_metadata" USING "btree" ("plan_id");



CREATE INDEX "idx_employees_department" ON "public"."employees" USING "btree" ("department");



CREATE INDEX "idx_employees_email_org" ON "public"."employees" USING "btree" ("email", "organization_id");



CREATE INDEX "idx_employees_member_id" ON "public"."employees" USING "btree" ("member_id");



CREATE INDEX "idx_employees_organization_id" ON "public"."employees" USING "btree" ("organization_id");



CREATE INDEX "idx_employees_status" ON "public"."employees" USING "btree" ("status");



CREATE INDEX "idx_job_locations_is_active" ON "public"."job_locations" USING "btree" ("is_active");



CREATE INDEX "idx_job_locations_org" ON "public"."job_locations" USING "btree" ("organization_id");



CREATE INDEX "idx_job_locations_organization" ON "public"."job_locations" USING "btree" ("organization_id");



CREATE INDEX "idx_job_locations_type" ON "public"."job_locations" USING "btree" ("type");



CREATE INDEX "idx_org_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_members_org" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_metrics_org" ON "public"."organization_metrics" USING "btree" ("organization_id");



CREATE INDEX "idx_payment_methods_default" ON "public"."payment_methods" USING "btree" ("organization_id", "is_default");



CREATE INDEX "idx_payment_methods_org" ON "public"."payment_methods" USING "btree" ("organization_id");



CREATE INDEX "idx_pto_requests_org" ON "public"."pto_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_subscription_events_organization_id" ON "public"."subscription_events" USING "btree" ("organization_id");



CREATE INDEX "idx_subscription_events_type_created_at" ON "public"."subscription_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_subscription_plans_active" ON "public"."subscription_plans" USING "btree" ("is_active");



CREATE INDEX "idx_subscription_plans_custom" ON "public"."subscription_plans" USING "btree" ("is_custom");



CREATE INDEX "idx_subscription_plans_type" ON "public"."subscription_plans" USING "btree" ("type");



CREATE INDEX "idx_subscription_transactions_org" ON "public"."subscription_transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_subscription_transactions_status" ON "public"."subscription_transactions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_org" ON "public"."subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_time_entries_org" ON "public"."time_entries" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "job_locations_name_address_unique" ON "public"."job_locations" USING "btree" ("organization_id", "public"."normalize_string"("name"), "public"."normalize_string"(COALESCE("address", ''::"text")), "public"."normalize_string"(COALESCE("city", ''::"text")), "public"."normalize_string"(COALESCE("state", ''::"text")), "public"."normalize_string"(COALESCE("zip", ''::"text")));



COMMENT ON INDEX "public"."job_locations_name_address_unique" IS 'Ensures unique job locations within an organization based on normalized name and address fields';



CREATE UNIQUE INDEX "organization_invites_unique_pending_email" ON "public"."organization_invites" USING "btree" ("organization_id", "email") WHERE ("status" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "employee_photo_cleanup_trigger" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."handle_employee_photo_change"();



CREATE OR REPLACE TRIGGER "handle_empty_review_notes_trigger" BEFORE INSERT OR UPDATE ON "public"."timesheets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_empty_review_notes"();



CREATE OR REPLACE TRIGGER "refresh_admin_members_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_admin_members"();



CREATE OR REPLACE TRIGGER "set_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_service_types_updated_at" BEFORE UPDATE ON "public"."service_types" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timesheet_updated_at" BEFORE UPDATE ON "public"."timesheets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "subscription_events_updated_at" BEFORE UPDATE ON "public"."subscription_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscription_events_updated_at"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_locations_updated_at" BEFORE UPDATE ON "public"."job_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_members_updated_at" BEFORE UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_service_types_updated_at_trigger" BEFORE UPDATE ON "public"."service_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_service_types_updated_at"();



ALTER TABLE ONLY "public"."custom_plan_metadata"
    ADD CONSTRAINT "custom_plan_metadata_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."custom_plan_metadata"
    ADD CONSTRAINT "custom_plan_metadata_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."organization_members"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."job_locations"
    ADD CONSTRAINT "job_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_locations"
    ADD CONSTRAINT "job_locations_service_type_fkey" FOREIGN KEY ("service_type") REFERENCES "public"."service_types"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."pto_requests"
    ADD CONSTRAINT "pto_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pto_requests"
    ADD CONSTRAINT "pto_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pto_requests"
    ADD CONSTRAINT "pto_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_types"
    ADD CONSTRAINT "service_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_parent_plan_id_fkey" FOREIGN KEY ("parent_plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."subscription_transactions"
    ADD CONSTRAINT "subscription_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."super_admins"
    ADD CONSTRAINT "super_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."super_admins"
    ADD CONSTRAINT "super_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_job_location_id_fkey" FOREIGN KEY ("job_location_id") REFERENCES "public"."job_locations"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_service_type_fkey" FOREIGN KEY ("service_type") REFERENCES "public"."service_types"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Admins can insert subscriptions for their organizations" ON "public"."subscriptions" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update any time entries in their organization" ON "public"."time_entries" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update any timesheets in their organization" ON "public"."timesheets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "timesheets"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "timesheets"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update subscriptions for their organizations" ON "public"."subscriptions" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update their organizations" ON "public"."organizations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_members"
  WHERE (("admin_members"."organization_id" = "organizations"."id") AND ("admin_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Admins full access" ON "public"."organization_members" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_members"
  WHERE (("admin_members"."user_id" = "auth"."uid"()) AND ("admin_members"."organization_id" = "organization_members"."organization_id")))));



CREATE POLICY "All authenticated users can check super admin status" ON "public"."super_admins" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All users can check super admin status" ON "public"."super_admins" FOR SELECT USING (true);



CREATE POLICY "Allow admins to delete service types" ON "public"."service_types" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow admins to insert service types" ON "public"."service_types" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow admins to update service types" ON "public"."service_types" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow authenticated users to read service types" ON "public"."service_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow organization admins to delete service types" ON "public"."service_types" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow organization admins to insert service types" ON "public"."service_types" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Allow organization admins to update service types" ON "public"."service_types" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Anyone can view active plans" ON "public"."subscription_plans" FOR SELECT USING (true);



CREATE POLICY "Employees can update their own PTO settings" ON "public"."employees" FOR UPDATE TO "authenticated" USING (("member_id" IN ( SELECT "organization_members"."id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) WITH CHECK (("member_id" IN ( SELECT "organization_members"."id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Employees can update their own photo_url" ON "public"."employees" FOR UPDATE USING (("auth"."uid"() = "member_id")) WITH CHECK (("auth"."uid"() = "member_id"));



CREATE POLICY "Invites can be created by organization admins and managers" ON "public"."organization_invites" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invites"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"]))))));



CREATE POLICY "Invites can be read by invited users" ON "public"."organization_invites" FOR SELECT TO "authenticated" USING (("lower"("email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "Invites can be read by organization admins and managers" ON "public"."organization_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invites"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"]))))));



CREATE POLICY "Invites can be updated by invited users" ON "public"."organization_invites" FOR UPDATE TO "authenticated" USING (("lower"("email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))) WITH CHECK (("lower"("email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "Invites can be updated by organization admins and managers" ON "public"."organization_invites" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invites"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organization_invites"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"]))))));



CREATE POLICY "Only super admins can manage custom plans" ON "public"."custom_plan_metadata" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "auth"."users"
  WHERE ("users"."is_super_admin" = true))));



CREATE POLICY "Only super admins can manage plans" ON "public"."subscription_plans" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "auth"."users"
  WHERE ("users"."is_super_admin" = true))));



CREATE POLICY "Only system can create transactions" ON "public"."subscription_transactions" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "auth"."users"
  WHERE ("users"."is_super_admin" = true))));



CREATE POLICY "Organization admins can manage departments" ON "public"."departments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_members" "om"
     JOIN "public"."employees" "e" ON (("e"."member_id" = "om"."id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "departments"."organization_id") AND ("e"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can manage job locations" ON "public"."job_locations" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "job_locations"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization admins can manage service types" ON "public"."service_types" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_members" "om"
     JOIN "public"."employees" "e" ON (("e"."member_id" = "om"."id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."organization_id" = "service_types"."organization_id") AND ("e"."role" = 'admin'::"text")))));



CREATE POLICY "Organization admins can manage their payment methods" ON "public"."payment_methods" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization admins can update any timesheet" ON "public"."timesheets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "timesheets"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization admins can update their organization" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role"))))) WITH CHECK (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization admins can view all timesheets" ON "public"."timesheets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "timesheets"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization admins can view their custom plans" ON "public"."custom_plan_metadata" FOR SELECT USING ((("client_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))) OR ("auth"."uid"() IN ( SELECT "users"."id"
   FROM "auth"."users"
  WHERE ("users"."is_super_admin" = true)))));



CREATE POLICY "Organization admins can view their payment methods" ON "public"."payment_methods" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization admins can view their transactions" ON "public"."subscription_transactions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organization members can view job locations" ON "public"."job_locations" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organization members can view their departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organization members can view their organization" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organization members can view their service types" ON "public"."service_types" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Organizations can delete their own employees" ON "public"."employees" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Organizations can insert their own employees" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'admin'::"public"."user_role")))) OR ("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."id" = "employees"."member_id"))))));



CREATE POLICY "Organizations can update their own employees" ON "public"."employees" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"]))))));



CREATE POLICY "Organizations can view their own employees" ON "public"."employees" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Super admins can delete subscription plans" ON "public"."subscription_plans" FOR DELETE USING (("auth"."uid"() IN ( SELECT "super_admins"."user_id"
   FROM "public"."super_admins")));



CREATE POLICY "Super admins can delete super_admins" ON "public"."super_admins" FOR DELETE USING (("auth"."uid"() IN ( SELECT "super_admins_1"."user_id"
   FROM "public"."super_admins" "super_admins_1")));



CREATE POLICY "Super admins can insert subscription plans" ON "public"."subscription_plans" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "super_admins"."user_id"
   FROM "public"."super_admins")));



CREATE POLICY "Super admins can insert super_admins" ON "public"."super_admins" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "super_admins_1"."user_id"
   FROM "public"."super_admins" "super_admins_1")));



CREATE POLICY "Super admins can update subscription plans" ON "public"."subscription_plans" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "super_admins"."user_id"
   FROM "public"."super_admins")));



CREATE POLICY "Super admins can view all organizations" ON "public"."organizations" FOR SELECT USING (("auth"."uid"() IN ( SELECT "super_admins"."user_id"
   FROM "public"."super_admins")));



CREATE POLICY "Super admins can view all subscription plans" ON "public"."subscription_plans" FOR SELECT USING (("auth"."uid"() IN ( SELECT "super_admins"."user_id"
   FROM "public"."super_admins")));



CREATE POLICY "Super admins can view all subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() IN ( SELECT "super_admins"."user_id"
   FROM "public"."super_admins")));



CREATE POLICY "Users can create their own time entries" ON "public"."time_entries" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id"))))));



CREATE POLICY "Users can delete their own time entries" ON "public"."time_entries" FOR DELETE USING ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id"))))));



CREATE POLICY "Users can read PTO requests in their organization" ON "public"."pto_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "pto_requests"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
           FROM "public"."employees" "e"
          WHERE (("e"."id" = "pto_requests"."user_id") AND ("e"."member_id" = "om"."id")))) OR ("om"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"])))))));



CREATE POLICY "Users can update their draft and submitted timesheets" ON "public"."timesheets" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."employees" "e"
     JOIN "public"."organization_members" "om" ON (("e"."member_id" = "om"."id")))
  WHERE (("e"."id" = "timesheets"."employee_id") AND ("om"."user_id" = "auth"."uid"())))) AND (("status")::"text" = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying])::"text"[])))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."employees" "e"
     JOIN "public"."organization_members" "om" ON (("e"."member_id" = "om"."id")))
  WHERE (("e"."id" = "timesheets"."employee_id") AND ("om"."user_id" = "auth"."uid"())))) AND (("status")::"text" = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying])::"text"[]))));



CREATE POLICY "Users can update their own time entries" ON "public"."time_entries" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id")))))) WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id"))))));



CREATE POLICY "Users can update their pending PTO requests" ON "public"."pto_requests" FOR UPDATE USING (((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")) OR ("auth"."uid"() IN ( SELECT "organization_members"."user_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "pto_requests"."organization_id") AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"]))))))) WITH CHECK (((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")) OR ("auth"."uid"() IN ( SELECT "organization_members"."user_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "pto_requests"."organization_id") AND ("organization_members"."role" = ANY (ARRAY['admin'::"public"."user_role", 'manager'::"public"."user_role"])))))));



CREATE POLICY "Users can view subscriptions for their organizations" ON "public"."subscriptions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organizations" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "organizations"."id") AND ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own employee record" ON "public"."employees" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "organization_members"."id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own organization's subscriptions" ON "public"."subscriptions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own organizations" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own time entries" ON "public"."time_entries" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."organization_id" = "time_entries"."organization_id") AND ("organization_members"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Users can view their own timesheets" ON "public"."timesheets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."employees" "e"
     JOIN "public"."organization_members" "om" ON (("e"."member_id" = "om"."id")))
  WHERE (("e"."id" = "timesheets"."employee_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "View own memberships" ON "public"."organization_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."clock_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_plan_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pto_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_events_all_policy" ON "public"."subscription_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "subscription_events_select_policy" ON "public"."subscription_events" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."super_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_organization_invite"("p_invite_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_hours"("start_time" timestamp with time zone, "end_time" timestamp with time zone, "break_duration" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_hours"("start_time" timestamp with time zone, "end_time" timestamp with time zone, "break_duration" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_hours"("start_time" timestamp with time zone, "end_time" timestamp with time zone, "break_duration" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_organization_access"("p_org_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_organization_access"("p_org_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_organization_access"("p_org_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_organization_admin"("p_org_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_organization_admin"("p_org_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_organization_admin"("p_org_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_table_exists"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_table_exists"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_table_exists"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_time_entry_access"("p_employee_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_time_entry_access"("p_employee_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_time_entry_access"("p_employee_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_role_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_role_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_role_type"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_backup_tables"("days_to_retain" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_backup_tables"("days_to_retain" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_backup_tables"("days_to_retain" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_user_backup_tables"("days_to_retain" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_user_backup_tables"("days_to_retain" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_user_backup_tables"("days_to_retain" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_subscription_plan_stripe_ids"("plan_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_subscription_plan_stripe_ids"("plan_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_subscription_plan_stripe_ids"("plan_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_invite"("p_organization_id" "uuid", "p_email" "text", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_invite"("p_organization_id" "uuid", "p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_invite"("p_organization_id" "uuid", "p_email" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_transaction"("p_name" "text", "p_slug" "text", "p_user_id" "uuid", "p_branding" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_transaction"("p_name" "text", "p_slug" "text", "p_user_id" "uuid", "p_branding" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_transaction"("p_name" "text", "p_slug" "text", "p_user_id" "uuid", "p_branding" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_with_admin"("org_name" "text", "org_slug" "text", "admin_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_with_admin"("org_name" "text", "org_slug" "text", "admin_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_with_admin"("org_name" "text", "org_slug" "text", "admin_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_pto_request"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_hours" numeric, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_pto_request"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_hours" numeric, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_pto_request"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_hours" numeric, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_data_backups"("test_org_ids" "uuid"[], "cleanup_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_data_backups"("test_org_ids" "uuid"[], "cleanup_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_data_backups"("test_org_ids" "uuid"[], "cleanup_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_user_backups"("test_user_ids" "uuid"[], "cleanup_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_user_backups"("test_user_ids" "uuid"[], "cleanup_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_user_backups"("test_user_ids" "uuid"[], "cleanup_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_organization_invites"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_organization_invites"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_organization_invites"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_weekly_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid", "employee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_weekly_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid", "employee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_weekly_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid", "employee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_time_entries_by_email"("employee_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_time_entries_by_email"("employee_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_time_entries_by_email"("employee_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_time_entries_by_user_id"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_time_entries_by_user_id"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_time_entries_by_user_id"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_subscription"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_subscription"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_subscription"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_weekly_employee_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_weekly_employee_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weekly_employee_hours"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_employee_photo_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_employee_photo_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_employee_photo_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_empty_review_notes"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_empty_review_notes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_empty_review_notes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_subscription_plan"("plan_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_subscription_plan"("plan_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_subscription_plan"("plan_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_rls_check"("check_name" "text", "result" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."log_rls_check"("check_name" "text", "result" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_rls_check"("check_name" "text", "result" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_string"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_string"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_string"("input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_admin_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_admin_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_admin_members"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_organization_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_organization_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_organization_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_test_organizations"("test_org_ids" "uuid"[], "batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_test_organizations"("test_org_ids" "uuid"[], "batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_test_organizations"("test_org_ids" "uuid"[], "batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_test_users"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_test_users"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_test_users"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rollback_test_data_cleanup"("cleanup_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rollback_test_data_cleanup"("cleanup_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollback_test_data_cleanup"("cleanup_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rollback_test_user_cleanup"("cleanup_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rollback_test_user_cleanup"("cleanup_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollback_test_user_cleanup"("cleanup_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_initial_break_duration"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_initial_break_duration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_initial_break_duration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."setup_initial_super_admin"("admin_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."setup_initial_super_admin"("admin_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."setup_initial_super_admin"("admin_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."setup_rls_test_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."setup_rls_test_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."setup_rls_test_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_organization_setup"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_organization_setup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_organization_setup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_organization_visibility"("test_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."test_organization_visibility"("test_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_organization_visibility"("test_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_subscription_plan_activation"("plan_id" "uuid", "current_status" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_subscription_plan_activation"("plan_id" "uuid", "current_status" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_subscription_plan_activation"("plan_id" "uuid", "current_status" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employee_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_department" "text", "new_start_date" "date", "new_role" "text", "new_status" "text", "new_pto" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_employee_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_department" "text", "new_start_date" "date", "new_role" "text", "new_status" "text", "new_pto" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employee_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_department" "text", "new_start_date" "date", "new_role" "text", "new_status" "text", "new_pto" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employee_pto"("employee_id" "uuid", "new_pto" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_employee_pto"("employee_id" "uuid", "new_pto" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employee_pto"("employee_id" "uuid", "new_pto" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_plan_stripe_ids"("p_id" "uuid", "p_product_id" "text", "p_monthly_price_id" "text", "p_annual_price_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_plan_stripe_ids"("p_id" "uuid", "p_product_id" "text", "p_monthly_price_id" "text", "p_annual_price_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_plan_stripe_ids"("p_id" "uuid", "p_product_id" "text", "p_monthly_price_id" "text", "p_annual_price_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_types_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_types_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_types_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_plan"("plan_id" "uuid", "plan_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_plan"("plan_id" "uuid", "plan_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_plan"("plan_id" "uuid", "plan_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_plan_stripe_ids"("plan_id" "uuid", "product_id" "text", "monthly_price_id" "text", "annual_price_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_plan_stripe_ids"("plan_id" "uuid", "product_id" "text", "monthly_price_id" "text", "annual_price_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_plan_stripe_ids"("plan_id" "uuid", "product_id" "text", "monthly_price_id" "text", "annual_price_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timesheet_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timesheet_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timesheet_hours"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timesheet_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timesheet_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timesheet_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_photo_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_photo_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_basic_info"("employee_id" "uuid", "new_first_name" "text", "new_last_name" "text", "new_email" "text", "new_phone" "text", "new_photo_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_organization_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_organization_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_organization_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_test_data_removal"("test_org_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_test_data_removal"("test_org_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_test_data_removal"("test_org_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_test_user_removal"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_test_user_removal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_test_user_removal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_time_entry_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_time_entry_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_time_entry_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_timesheet_status_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_timesheet_status_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_timesheet_status_transition"() TO "service_role";


















GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."admin_members" TO "anon";
GRANT ALL ON TABLE "public"."admin_members" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_members" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."auth_identities_backup_20250318_032734" TO "anon";
GRANT ALL ON TABLE "public"."auth_identities_backup_20250318_032734" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_identities_backup_20250318_032734" TO "service_role";



GRANT ALL ON TABLE "public"."auth_mfa_challenges_backup_20250318_032734" TO "anon";
GRANT ALL ON TABLE "public"."auth_mfa_challenges_backup_20250318_032734" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_mfa_challenges_backup_20250318_032734" TO "service_role";



GRANT ALL ON TABLE "public"."auth_mfa_factors_backup_20250318_032734" TO "anon";
GRANT ALL ON TABLE "public"."auth_mfa_factors_backup_20250318_032734" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_mfa_factors_backup_20250318_032734" TO "service_role";



GRANT ALL ON TABLE "public"."auth_refresh_tokens_backup_20250318_032734" TO "anon";
GRANT ALL ON TABLE "public"."auth_refresh_tokens_backup_20250318_032734" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_refresh_tokens_backup_20250318_032734" TO "service_role";



GRANT ALL ON TABLE "public"."auth_sessions_backup_20250318_032734" TO "anon";
GRANT ALL ON TABLE "public"."auth_sessions_backup_20250318_032734" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_sessions_backup_20250318_032734" TO "service_role";



GRANT ALL ON TABLE "public"."auth_users_backup_20250318_032734" TO "anon";
GRANT ALL ON TABLE "public"."auth_users_backup_20250318_032734" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_users_backup_20250318_032734" TO "service_role";



GRANT ALL ON TABLE "public"."cleanup_logs" TO "anon";
GRANT ALL ON TABLE "public"."cleanup_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cleanup_logs" TO "service_role";



GRANT ALL ON TABLE "public"."clock_events" TO "anon";
GRANT ALL ON TABLE "public"."clock_events" TO "authenticated";
GRANT ALL ON TABLE "public"."clock_events" TO "service_role";



GRANT ALL ON TABLE "public"."custom_plan_metadata" TO "anon";
GRANT ALL ON TABLE "public"."custom_plan_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_plan_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."job_locations" TO "anon";
GRANT ALL ON TABLE "public"."job_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."job_locations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invites" TO "anon";
GRANT ALL ON TABLE "public"."organization_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invites" TO "service_role";



GRANT ALL ON TABLE "public"."organization_metrics" TO "anon";
GRANT ALL ON TABLE "public"."organization_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."pto_requests" TO "anon";
GRANT ALL ON TABLE "public"."pto_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."pto_requests" TO "service_role";



GRANT ALL ON TABLE "public"."rls_debug_log" TO "anon";
GRANT ALL ON TABLE "public"."rls_debug_log" TO "authenticated";
GRANT ALL ON TABLE "public"."rls_debug_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rls_debug_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rls_debug_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rls_debug_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."service_types" TO "anon";
GRANT ALL ON TABLE "public"."service_types" TO "authenticated";
GRANT ALL ON TABLE "public"."service_types" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_transactions" TO "anon";
GRANT ALL ON TABLE "public"."subscription_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."super_admins" TO "anon";
GRANT ALL ON TABLE "public"."super_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."super_admins" TO "service_role";



GRANT ALL ON TABLE "public"."test_user_ids" TO "anon";
GRANT ALL ON TABLE "public"."test_user_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."test_user_ids" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."timesheets" TO "anon";
GRANT ALL ON TABLE "public"."timesheets" TO "authenticated";
GRANT ALL ON TABLE "public"."timesheets" TO "service_role";



GRANT ALL ON TABLE "public"."user_cleanup_logs" TO "anon";
GRANT ALL ON TABLE "public"."user_cleanup_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cleanup_logs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
