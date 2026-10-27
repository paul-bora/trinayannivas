-- Trinayan Nivas Housing Society: tables, row-level security, helper functions and storage.
-- Run once in Supabase → SQL Editor (or `supabase db push`).

-- ───────────────────────── Tables ─────────────────────────

create table public.units (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  block text,
  area_sqft integer,
  owner_name text,
  occupancy text not null default 'owner' check (occupancy in ('owner', 'tenant', 'vacant')),
  two_wheelers integer not null default 0 check (two_wheelers >= 0),
  four_wheelers integer not null default 0 check (four_wheelers >= 0),
  vehicle_numbers text not null default '',
  created_at timestamptz not null default now()
);

-- Only emails on this list can log in. Admins maintain it from the Members screen.
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  name text not null,
  unit_id uuid references public.units on delete set null,
  role text not null default 'resident' check (role in ('resident', 'admin')),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  name text not null,
  phone text,
  unit_id uuid references public.units on delete set null,
  role text not null default 'resident' check (role in ('resident', 'admin')),
  hide_phone boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.unit_members (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units on delete cascade,
  name text not null,
  relation text,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null,
  image_path text,
  created_at timestamptz not null default now()
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  primary key (post_id, user_id)
);

create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null default 'sell' check (kind in ('sell', 'buy')),
  title text not null,
  description text,
  price numeric(12, 2),
  contact_phone text,
  image_path text,
  status text not null default 'available' check (status in ('available', 'closed')),
  created_at timestamptz not null default now()
);

create table public.directory_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('emergency', 'vendor', 'committee')),
  name text not null,
  role text,
  phone text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create table public.dues (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'due' check (status in ('due', 'paid')),
  paid_on date,
  mode text,
  reference text,
  reported_reference text,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (unit_id, month)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  note text,
  receipt_path text,
  added_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.settings (
  id integer primary key default 1 check (id = 1),
  society_name text not null default 'Trinayan Nivas Housing Society',
  upi_id text,
  upi_name text,
  upi_qr_path text,
  whatsapp_link text,
  rules_text text,
  monthly_maintenance numeric(12, 2) not null default 0,
  opening_balance numeric(12, 2) not null default 0
);
insert into public.settings default values;

create index on public.posts (created_at desc);
create index on public.post_comments (post_id);
create index on public.dues (month);
create index on public.expenses (spent_on);

-- ───────────────────────── Helpers ─────────────────────────

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function public.my_unit_id() returns uuid
language sql stable security definer set search_path = public as $$
  select unit_id from profiles where id = auth.uid();
$$;

-- Blocks sign-up for emails that are not on the allow-list, and creates the profile.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a allowed_emails;
begin
  select * into a from allowed_emails where email = lower(new.email);
  if not found then
    raise exception 'EMAIL_NOT_REGISTERED';
  end if;
  insert into profiles (id, email, name, unit_id, role)
  values (new.id, a.email, a.name, a.unit_id, a.role);
  update allowed_emails set joined_at = now() where email = a.email;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps unit/role in step with the allow-list; removing an email removes that login.
create function public.sync_allowed_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from auth.users where lower(email) = old.email;
    return old;
  end if;
  update profiles set unit_id = new.unit_id, role = new.role where email = new.email;
  return new;
end $$;

create trigger allowed_emails_sync
  after update or delete on public.allowed_emails
  for each row execute function public.sync_allowed_email();

-- ───────────────────────── Functions called by the app ─────────────────────────

create function public.my_profile() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'email', p.email, 'name', p.name, 'phone', p.phone,
    'hide_phone', p.hide_phone, 'role', p.role, 'unit_id', p.unit_id,
    'unit', (select row_to_json(u) from units u where u.id = p.unit_id))
  from profiles p where p.id = auth.uid();
$$;

create function public.update_my_profile(p_name text, p_phone text, p_hide_phone boolean) returns void
language sql security definer set search_path = public as $$
  update profiles
  set name = coalesce(nullif(trim(p_name), ''), name),
      phone = nullif(trim(p_phone), ''),
      hide_phone = p_hide_phone
  where id = auth.uid();
$$;

create function public.update_my_vehicles(p_two integer, p_four integer, p_numbers text) returns void
language sql security definer set search_path = public as $$
  update units
  set two_wheelers = greatest(p_two, 0), four_wheelers = greatest(p_four, 0), vehicle_numbers = coalesce(p_numbers, '')
  where id = public.my_unit_id();
$$;

create function public.report_payment(p_due_id uuid, p_reference text) returns void
language sql security definer set search_path = public as $$
  update dues
  set reported_reference = nullif(trim(p_reference), ''), reported_at = now()
  where id = p_due_id and unit_id = public.my_unit_id() and status = 'due';
$$;

create function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;

create function public.generate_dues(p_month text, p_amount numeric) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not is_admin() then raise exception 'Only admins can generate dues'; end if;
  if p_month !~ '^\d{4}-\d{2}$' then raise exception 'Month must look like 2026-11'; end if;
  insert into dues (unit_id, month, amount)
  select id, p_month, p_amount from units
  on conflict (unit_id, month) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.finance_summary(p_month text) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  start_d date := to_date(p_month || '-01', 'YYYY-MM-DD');
  end_d date := (to_date(p_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
begin
  if not is_admin() then raise exception 'Only admins can view accounts'; end if;
  return json_build_object(
    'collected_month', coalesce((select sum(amount) from dues where status = 'paid' and paid_on >= start_d and paid_on < end_d), 0),
    'spent_month', coalesce((select sum(amount) from expenses where spent_on >= start_d and spent_on < end_d), 0),
    'collected_total', coalesce((select sum(amount) from dues where status = 'paid'), 0),
    'spent_total', coalesce((select sum(amount) from expenses), 0),
    'opening_balance', (select opening_balance from settings where id = 1),
    'pending_total', coalesce((select sum(amount) from dues where status = 'due'), 0),
    'pending_units', (select count(distinct unit_id) from dues where status = 'due'));
end $$;

-- Neighbour list: every registered member (whether or not they've logged in yet), plus
-- flats with nobody registered. Phone numbers are hidden for residents who asked for it.
create view public.neighbours as
  select concat('m-', u.id, '-', a.name) as id,
         coalesce(p.name, a.name) as name,
         case when p.id is null then null
              when p.hide_phone and p.id <> auth.uid() and not public.is_admin() then null
              else p.phone end as phone,
         u.number as unit_number, u.block,
         p.id is not null as joined
  from allowed_emails a
  left join profiles p on p.email = a.email
  left join units u on u.id = a.unit_id
  where auth.uid() is not null
  union all
  select concat('u-', u.id), coalesce(u.owner_name, 'No resident added'), null, u.number, u.block, false
  from units u
  where auth.uid() is not null
    and not exists (select 1 from allowed_emails a where a.unit_id = u.id);

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.units enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.unit_members enable row level security;
alter table public.announcements enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_reports enable row level security;
alter table public.listings enable row level security;
alter table public.directory_entries enable row level security;
alter table public.documents enable row level security;
alter table public.dues enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

-- Nothing is readable without logging in. Logged-in users get table access, which the
-- row-level security policies above then narrow down. (Newer Supabase projects don't
-- grant this automatically.)
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.neighbours from authenticated;

-- Residents may see each other's name and flat, but not email/phone (phones come via the neighbours view).
revoke select, insert, update, delete on public.profiles from authenticated;
grant select (id, name, unit_id, role) on public.profiles to authenticated;
create policy "profiles: read" on public.profiles for select to authenticated using (true);

create policy "units: read" on public.units for select to authenticated using (true);
create policy "units: admin" on public.units for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "allowed_emails: admin" on public.allowed_emails for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "unit_members: own unit or admin" on public.unit_members for all to authenticated
  using (unit_id = public.my_unit_id() or public.is_admin())
  with check (unit_id = public.my_unit_id() or public.is_admin());

create policy "announcements: read" on public.announcements for select to authenticated using (true);
create policy "announcements: admin" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "posts: read" on public.posts for select to authenticated using (true);
create policy "posts: create own" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "posts: delete own or admin" on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "comments: read" on public.post_comments for select to authenticated using (true);
create policy "comments: create own" on public.post_comments for insert to authenticated with check (author_id = auth.uid());
create policy "comments: delete own or admin" on public.post_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "likes: read" on public.post_likes for select to authenticated using (true);
create policy "likes: own" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes: remove own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "reports: create own" on public.post_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports: admin read" on public.post_reports for select to authenticated using (public.is_admin());
create policy "reports: admin delete" on public.post_reports for delete to authenticated using (public.is_admin());

create policy "listings: read" on public.listings for select to authenticated using (true);
create policy "listings: create own" on public.listings for insert to authenticated with check (seller_id = auth.uid());
create policy "listings: update own or admin" on public.listings for update to authenticated
  using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());
create policy "listings: delete own or admin" on public.listings for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

create policy "directory: read" on public.directory_entries for select to authenticated using (true);
create policy "directory: admin" on public.directory_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "documents: read" on public.documents for select to authenticated using (true);
create policy "documents: admin" on public.documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "dues: own unit or admin" on public.dues for select to authenticated
  using (unit_id = public.my_unit_id() or public.is_admin());
create policy "dues: admin" on public.dues for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "expenses: admin" on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settings: read" on public.settings for select to authenticated using (true);
create policy "settings: admin" on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Functions that change data are for logged-in users only.
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
-- The sign-up trigger runs on behalf of the auth service.
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Called by the GitHub keep-alive workflow so the free project doesn't pause. Reads no data.
create function public.ping() returns boolean language sql stable as $$ select true $$;
grant execute on function public.ping() to anon, authenticated;

-- ───────────────────────── File storage ─────────────────────────
-- media: post/listing photos and the UPI QR (public links, random names)
-- documents: society PDFs (logged-in residents)
-- receipts: expense receipts (admins only)

insert into storage.buckets (id, name, public) values
  ('media', 'media', true),
  ('documents', 'documents', false),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "media: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "documents: read" on storage.objects for select to authenticated
  using (bucket_id = 'documents');
create policy "documents and receipts: admin" on storage.objects for all to authenticated
  using (bucket_id in ('documents', 'receipts') and public.is_admin())
  with check (bucket_id in ('documents', 'receipts') and public.is_admin());
