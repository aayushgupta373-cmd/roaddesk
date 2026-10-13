-- OPTIONAL. Only run this if you already ran an older version of the tables
-- and want to start clean. It DELETES all reports, history and profiles.
drop table if exists public.status_history cascade;
drop table if exists public.reports cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.limit_report_rate() cascade;
drop function if exists public.log_status_change() cascade;
