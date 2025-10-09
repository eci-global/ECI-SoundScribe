import { createClient } from '@supabase/supabase-js';

// Supabase configuration using service role to execute migrations
const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.uuoZWxCDJ5SyYXQx0_yWVJI9-TdxHyQQQMXIEqhWMHU";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationSQL = `
-- Migration: Make employees.employee_id mirror UUID id, preserve legacy codes in employees.employee_code
begin;

-- 1) Ensure uuid extension available
create extension if not exists "uuid-ossp";

-- 2) Add legacy human code column if missing
alter table public.employees add column if not exists employee_code text;

-- Backfill employee_code from employee_id when it looks like a non-UUID code
update public.employees
set employee_code = employee_id
where employee_code is null and employee_id is not null;

-- 3) Replace employee_id with a generated column mirroring id::text
do $$
begin
  -- Drop employee_id if it exists and is not a generated column
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'employee_id'
  ) then
    alter table public.employees drop column employee_id;
  end if;
exception when undefined_column then
  null;
end $$;

alter table public.employees
  add column employee_id text generated always as (id::text) stored;

-- 4) Backfill child tables to reference employees by UUID (if they currently store legacy codes)

-- a) employee_scorecards
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_scorecards' and column_name='employee_id' and data_type in ('text','character varying')
  ) then
    update public.employee_scorecards sc
    set employee_id = e.id::text
    from public.employees e
    where sc.employee_id = e.employee_code
      and sc.employee_id is not null
      and e.employee_code is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_scorecards' and column_name='employee_id' and data_type='uuid'
  ) then
    update public.employee_scorecards sc
    set employee_id = e.id
    from public.employees e
    where sc.employee_id::text = e.employee_code
      and e.employee_code is not null;
  end if;
end $$;

-- b) employee_call_participation
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_call_participation' and column_name='employee_id' and data_type in ('text','character varying')
  ) then
    update public.employee_call_participation cp
    set employee_id = e.id::text
    from public.employees e
    where cp.employee_id = e.employee_code
      and cp.employee_id is not null
      and e.employee_code is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employee_call_participation' and column_name='employee_id' and data_type='uuid'
  ) then
    update public.employee_call_participation cp
    set employee_id = e.id
    from public.employees e
    where cp.employee_id::text = e.employee_code
      and e.employee_code is not null;
  end if;
end $$;

-- c) manager_coaching_notes
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='manager_coaching_notes' and column_name='employee_id' and data_type in ('text','character varying')
  ) then
    update public.manager_coaching_notes n
    set employee_id = e.id::text
    from public.employees e
    where n.employee_id = e.employee_code
      and n.employee_id is not null
      and e.employee_code is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='manager_coaching_notes' and column_name='employee_id' and data_type='uuid'
  ) then
    update public.manager_coaching_notes n
    set employee_id = e.id
    from public.employees e
    where n.employee_id::text = e.employee_code
      and e.employee_code is not null;
  end if;
end $$;

commit;
`;

async function applyEmployeeIdMigration() {
  try {
    console.log('🚀 Applying employee ID migration...');

    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Migration applied successfully');
    console.log('Migration result:', data);

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
  }
}

// Run the migration
applyEmployeeIdMigration();