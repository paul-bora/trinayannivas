-- Starter data. Run after 0001_init.sql in Supabase → SQL Editor.

-- 1) YOUR FIRST ADMIN: change the email and name below before running.
--    This person logs in first and then adds everyone else from Admin → Members.
insert into public.allowed_emails (email, name, role)
values (lower('paulbora2008@gmail.com'), 'Society Secretary', 'admin');

-- 2) Common emergency numbers (India). Edit or add local ones from the app.
insert into public.directory_entries (type, name, role, phone, sort) values
  ('emergency', 'National Emergency', 'All emergencies', '112', 1),
  ('emergency', 'Police', 'Police control room', '100', 2),
  ('emergency', 'Fire', 'Fire brigade', '101', 3),
  ('emergency', 'Ambulance', 'Medical emergency', '108', 4),
  ('emergency', 'Women Helpline', 'Women in distress', '1091', 5);

-- 3) Optional sample flats, for trying the app out. Delete these before going live
--    (Admin → Members) or skip this block and add your real flats in the app.
-- insert into public.units (number, block, owner_name) values
--   ('A-101', 'A', 'Sample Owner 1'),
--   ('A-102', 'A', 'Sample Owner 2'),
--   ('B-201', 'B', 'Sample Owner 3');
