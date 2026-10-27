-- Directory → Neighbours now lists every member the committee has added (not only those
-- who have logged in), plus flats with nobody registered yet. Safe to run more than once.

drop view if exists public.neighbours;

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

revoke all on public.neighbours from anon;
grant select on public.neighbours to authenticated;
