-- A harmless function the GitHub keep-alive workflow calls every few days so the free
-- Supabase project doesn't pause. It reads no data. Safe to run more than once.
create or replace function public.ping() returns boolean
language sql stable as $$ select true $$;

grant execute on function public.ping() to anon, authenticated;
