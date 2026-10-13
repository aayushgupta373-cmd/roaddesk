-- RoadDesk, step 1 of 3: tables, helper function and triggers.
-- Run this whole file once in Supabase: SQL Editor > New query > paste > Run.

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  phone text check (char_length(phone) <= 20),
  role text not null default 'citizen'
    check (role in ('citizen', 'admin', 'worker')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text check (char_length(description) <= 2000),
  category text not null
    check (category in ('pothole', 'crack', 'waterlogging', 'missing_cover',
                        'damaged_divider', 'signage', 'other')),
  severity text not null
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'reported'
    check (status in ('reported', 'verified', 'assigned', 'in_progress',
                      'resolved', 'rejected')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text check (char_length(address) <= 300),
  image_path text
    check (image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  assigned_to uuid references public.profiles(id) on delete set null,
  admin_note text check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_user_idx    on public.reports (user_id);
create index reports_status_idx  on public.reports (status);
create index reports_created_idx on public.reports (created_at desc);

create table public.status_history (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.reports(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  comment text,
  changed_at timestamptz not null default now()
);

create index status_history_report_idx on public.status_history (report_id);

-- Nobody from the website can touch these tables as the anonymous role.
revoke all on public.profiles, public.reports, public.status_history from anon;

-- ---------- Helper: is the current user an admin? ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Trigger: create a profile when someone signs up ----------
-- The role is always 'citizen'. Nothing sent from the browser can change that.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(new.raw_user_meta_data ->> 'full_name', 100),
    left(new.raw_user_meta_data ->> 'phone', 20)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Trigger: keep updated_at current ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ---------- Trigger: rate limit (5 reports per user per hour) ----------
-- Skipped when auth.uid() is null, which is the case in the SQL Editor,
-- so you can still load demo data.

create or replace function public.limit_report_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if (select count(*) from public.reports
        where user_id = new.user_id
          and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'You have sent too many reports in the last hour. Please try again later.';
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_limit_rate
  before insert on public.reports
  for each row execute function public.limit_report_rate();

-- ---------- Trigger: write the status history automatically ----------
-- The website never writes to status_history directly, so it cannot be faked.

create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (report_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, new.user_id);
  elsif new.status is distinct from old.status then
    insert into public.status_history (report_id, old_status, new_status, changed_by, comment)
    values (new.id, old.status, new.status, auth.uid(), new.admin_note);
  end if;
  return new;
end;
$$;

create trigger reports_log_status
  after insert or update on public.reports
  for each row execute function public.log_status_change();
