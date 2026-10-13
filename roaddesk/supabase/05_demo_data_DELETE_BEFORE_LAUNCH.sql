-- OPTIONAL, for screenshots and your project demo only.
-- 1. Replace the email below with the account that should own the demo reports.
-- 2. Run. 3. Before real launch, run the DELETE line at the bottom.
-- Coordinates are placed around Raipur. Change them to your own city.

with owner as (
  select id from auth.users where email = 'REPLACE-WITH-YOUR-EMAIL@example.com'
)
insert into public.reports
  (user_id, title, description, category, severity, status, latitude, longitude, address)
select owner.id, v.title, '[demo] ' || v.description, v.category, v.severity, v.status,
       v.lat, v.lng, v.address
from owner, (values
  ('Deep pothole near market junction', 'Pothole about 30 cm wide, two-wheelers swerve to avoid it.', 'pothole', 'high', 'reported', 21.2514, 81.6296, 'Demo road 1'),
  ('Open manhole on service lane', 'Cover is missing and there is no barricade.', 'missing_cover', 'critical', 'verified', 21.2380, 81.6337, 'Demo road 2'),
  ('Waterlogging after rain', 'Water stays for hours near the underpass.', 'waterlogging', 'medium', 'assigned', 21.2602, 81.6150, 'Demo road 3'),
  ('Cracked surface near school gate', 'Long crack along the edge of the lane.', 'crack', 'low', 'reported', 21.2290, 81.6480, 'Demo road 4'),
  ('Broken divider section', 'Divider block fallen into the lane.', 'damaged_divider', 'high', 'in_progress', 21.2455, 81.6021, 'Demo road 5'),
  ('Faded speed limit sign', 'Sign cannot be read at night.', 'signage', 'low', 'resolved', 21.2711, 81.6402, 'Demo road 6'),
  ('Pothole cluster after flyover', 'Several potholes in a row over 20 metres.', 'pothole', 'medium', 'verified', 21.2189, 81.6215, 'Demo road 7'),
  ('Collapsed road edge near drain', 'Edge of road has caved in beside the drain.', 'crack', 'critical', 'assigned', 21.2533, 81.6577, 'Demo road 8'),
  ('Small pothole on colony road', 'Shallow pothole, growing slowly.', 'pothole', 'low', 'rejected', 21.2662, 81.5934, 'Demo road 9'),
  ('Standing water near bus stop', 'Drain is blocked and water spreads onto the road.', 'waterlogging', 'high', 'in_progress', 21.2347, 81.6114, 'Demo road 10')
) as v(title, description, category, severity, status, lat, lng, address);

-- Run this before launch to remove all demo reports:
-- delete from public.reports where description like '[demo]%';
