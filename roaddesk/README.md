# RoadDesk

Road maintenance reporting platform. Plain HTML, CSS and JavaScript on the front end, Supabase for database, sign-in and photo storage, Netlify for hosting.

## Layout

- `site/`       the public website (this is the only folder that gets published)
- `supabase/`   SQL files, run once in the Supabase SQL Editor, in number order
- `netlify.toml` tells Netlify to publish `site/`

## Before launch: search the whole project for these and replace every one

| Search for | Replace with |
|---|---|
| `YOURDOMAIN.in` | your real domain |
| `{{OPERATOR_NAME}}` | the person or organisation running the site |
| `{{CONTACT_EMAIL}}` | a real inbox you read |
| `{{JURISDICTION}}` | for example "India" |
| `YOUR-PROJECT-REF`, `YOUR-ANON-OR-PUBLISHABLE-KEY` | values from Supabase (in `site/js/config.js`) |

In VS Code press Ctrl+Shift+F, type the text, and check that nothing is left.

## Secrets rule

Only the Supabase project URL and the anon or publishable key may appear in this repository. The `service_role` key and anything starting `sb_secret_` must never be committed.
