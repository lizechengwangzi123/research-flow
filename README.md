# Research Flow

Research Flow is now structured as a free-start cloud web app:

- Hosting: Vercel
- Auth + Database + Realtime: Supabase
- Product form: responsive website with PWA support for desktop and smartphone

## What this version supports

- Email/password registration and login through Supabase Auth
- Email verification handled by Supabase
- Password reset handled by Supabase
- Personal dashboards and article details
- Add/edit your own article progress
- Friend connections by username or public ID
- Realtime refresh when articles or friend relationships change
- Admin-only user overview panel
- Installable PWA behavior

## Why this is the best no-purchase-first option

- no VPS needed to get started
- works across countries
- easier than managing your own server
- still gives you persistent accounts and realtime data

## Setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](/Users/dong/Documents/Playground/supabase/schema.sql).
3. Follow [supabase/README.md](/Users/dong/Documents/Playground/supabase/README.md).
4. Create a Vercel project and deploy this repository.
5. Add these Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Important note

In this architecture, Supabase manages passwords and email verification. That means the old local seeded `admin/admin` model is replaced by:

- sign up normally
- then mark one user as admin in Supabase SQL

## Key files

- `/Users/dong/Documents/Playground/index.html`
- `/Users/dong/Documents/Playground/app.js`
- `/Users/dong/Documents/Playground/styles.css`
- `/Users/dong/Documents/Playground/api/config.js`
- `/Users/dong/Documents/Playground/api/login.js`
- `/Users/dong/Documents/Playground/api/request-reset.js`
- `/Users/dong/Documents/Playground/vercel.json`
- `/Users/dong/Documents/Playground/supabase/schema.sql`
- `/Users/dong/Documents/Playground/supabase/README.md`
