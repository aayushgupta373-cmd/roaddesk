-- RoadDesk, step 2 of 3: Row Level Security.
-- This is what really protects your data. Run after 01_schema.sql.
-- No delete policies exist on purpose, so nobody can delete rows from the website.

alter table public.profiles       enable row level security;
alter table public.reports        enable row level security;
alter table public.status_history enable row level security;

-- PROFILES: you see your own profile, admins see all. Only admins can change profiles.
create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: admin updates"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- REPORTS: citizens create reports as themselves, always starting as 'reported'.
create policy "reports: citizen inserts own"
  on public.reports for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'reported'
    and assigned_to is null
    and admin_note is null
  );

create policy "reports: read own or admin"
  on public.reports for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "reports: admin updates"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- STATUS HISTORY: read only. Rows are written by a trigger.
create policy "history: owner or admin reads"
  on public.status_history for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.reports r
      where r.id = status_history.report_id and r.user_id = auth.uid()
    )
  );
