# Free Cloud Deployment Guide

This version is designed for a free-start cloud setup:

- Frontend hosting: Vercel
- Auth, database, and realtime: Supabase

## Why this is the new recommended path

- no server purchase required to start
- works across countries
- users can register and save their own research progress
- friends can view each other according to app permissions
- realtime updates come from Supabase subscriptions

## Steps

1. Create a Supabase project.
2. Run [supabase/schema.sql](/Users/dong/Documents/Playground/supabase/schema.sql) in the SQL editor.
3. Enable email confirmation in Supabase Auth.
4. Create a Vercel project from this folder or Git repository.
5. Add Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy.

## Optional domain

You can start free with the default `*.vercel.app` domain.

## Admin setup

After your first signup, make yourself admin in Supabase:

```sql
update public.profiles
set is_admin = true
where username = 'your_username';
```

## Realtime

Supabase Realtime is used for:

- article updates
- profile refreshes
- friend relationship changes
