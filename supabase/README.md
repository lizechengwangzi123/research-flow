# Supabase Setup

1. Create a new Supabase project.
2. In Supabase SQL Editor, run [schema.sql](/Users/dong/Documents/Playground/supabase/schema.sql).
3. In Supabase Auth settings:
   - enable Email provider
   - enable Confirm email
   - set Site URL to your Vercel production URL
   - add your Vercel preview and production URLs to Redirect URLs
4. After your first signup, mark one profile as admin:

```sql
update public.profiles
set is_admin = true
where username = 'your_username';
```

5. Copy your project URL and anon key into Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
