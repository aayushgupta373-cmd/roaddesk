-- Run AFTER you have registered an account on the site and confirmed its email.
-- Replace the email address, then run. Do this only for real municipal staff.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'REPLACE-WITH-YOUR-EMAIL@example.com');

-- Check the result (should show role = admin):
select p.id, u.email, p.role
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'REPLACE-WITH-YOUR-EMAIL@example.com';
