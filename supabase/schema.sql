create extension if not exists pgcrypto;

create sequence if not exists public.profile_public_id_seq start 1;
create sequence if not exists public.article_code_seq start 1;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_id text unique not null default 'USR-' || lpad(nextval('public.profile_public_id_seq')::text, 4, '0'),
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  email text unique not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id bigint generated always as identity primary key,
  article_code text unique not null default 'ART-' || lpad(nextval('public.article_code_seq')::text, 5, '0'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  journal text not null,
  submitted_date date not null,
  first_author text not null,
  corresponding_author text not null,
  status text not null,
  review_days integer not null default 0,
  editor_days integer not null default 0,
  publish_days integer,
  decision_date date,
  revision_round text,
  manuscript_type text,
  co_authors text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create or replace function public.touch_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_articles_updated_at on public.articles;
create trigger trg_articles_updated_at
before update on public.articles
for each row execute function public.touch_articles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    lower(new.email)
  );
  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.user_id = auth.uid() and f.friend_id = profiles.id
  )
  or public.is_admin_user()
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "articles_select_visible" on public.articles;
create policy "articles_select_visible"
on public.articles
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.user_id = auth.uid() and f.friend_id = articles.user_id
  )
  or public.is_admin_user()
);

drop policy if exists "articles_insert_self" on public.articles;
create policy "articles_insert_self"
on public.articles
for insert
with check (user_id = auth.uid());

drop policy if exists "articles_update_self" on public.articles;
create policy "articles_update_self"
on public.articles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "articles_delete_self" on public.articles;
create policy "articles_delete_self"
on public.articles
for delete
using (user_id = auth.uid());

drop policy if exists "friendships_select_related" on public.friendships;
create policy "friendships_select_related"
on public.friendships
for select
using (user_id = auth.uid() or friend_id = auth.uid());

create or replace function public.add_friend_by_username(lookup_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid := auth.uid();
  target_id uuid;
begin
  if my_id is null then
    raise exception 'Not authenticated';
  end if;

  select id
  into target_id
  from public.profiles
  where lower(username) = lower(lookup_text)
     or lower(public_id) = lower(lookup_text)
  limit 1;

  if target_id is null then
    raise exception 'Friend not found';
  end if;

  if target_id = my_id then
    raise exception 'You cannot add yourself';
  end if;

  insert into public.friendships (user_id, friend_id)
  values (my_id, target_id)
  on conflict do nothing;

  insert into public.friendships (user_id, friend_id)
  values (target_id, my_id)
  on conflict do nothing;
end;
$$;

create or replace function public.get_accessible_profiles()
returns table (
  id uuid,
  public_id text,
  username text,
  display_name text,
  is_admin boolean,
  created_at timestamptz,
  article_count bigint,
  accepted_count bigint,
  active_count bigint
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select id, is_admin
    from public.profiles
    where id = auth.uid()
  )
  select
    p.id,
    p.public_id,
    p.username,
    p.display_name,
    p.is_admin,
    p.created_at,
    count(a.id) as article_count,
    count(*) filter (where a.status = 'Accepted') as accepted_count,
    count(*) filter (where a.status in ('Under Review', 'With Editor')) as active_count
  from public.profiles p
  left join public.articles a on a.user_id = p.id
  where
    p.id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = p.id
    )
    or exists (
      select 1 from me where me.is_admin
    )
  group by p.id
  order by p.display_name;
$$;

create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  public_id text,
  username text,
  display_name text,
  email text,
  is_admin boolean,
  created_at timestamptz,
  article_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.public_id,
    p.username,
    p.display_name,
    p.email,
    p.is_admin,
    p.created_at,
    count(a.id) as article_count
  from public.profiles p
  left join public.articles a on a.user_id = p.id
  where exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.is_admin
  )
  group by p.id
  order by p.created_at desc;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.friendships to authenticated;
grant execute on function public.add_friend_by_username(text) to authenticated;
grant execute on function public.get_accessible_profiles() to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.is_admin_user() to authenticated;

alter table public.profiles replica identity full;
alter table public.articles replica identity full;
alter table public.friendships replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'articles'
  ) then
    alter publication supabase_realtime add table public.articles;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;

-- After your first signup, make that user admin manually if desired:
-- update public.profiles set is_admin = true where username = 'your_username';
