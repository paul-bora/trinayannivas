-- Fix for "permission denied for table ..." on projects where 0001_init.sql was run
-- before it included these grants. Safe to run more than once.
-- Newer Supabase projects don't give logged-in users table access automatically;
-- row-level security still decides which rows each person can see or change.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.neighbours from authenticated;

-- Residents may read only name/flat/role from profiles (email and phone stay private).
revoke select, insert, update, delete on public.profiles from authenticated;
grant select (id, name, unit_id, role) on public.profiles to authenticated;
