create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null default 'module_admin' check (role in ('superadmin', 'module_admin')),
  modules text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint admin_profiles_known_modules check (
    modules <@ array['requests', 'flood-monitor', 'map', 'shelters', 'supplies', 'volunteers', 'announcements']::text[]
  )
);

create or replace function public.has_module_access(required_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
      and (
        profile.role = 'superadmin'
        or required_module = any(profile.modules)
      )
  );
$$;

revoke all on function public.has_module_access(text) from public;
grant execute on function public.has_module_access(text) to anon, authenticated;

create table if not exists public.help_requests (
  id text primary key,
  name text not null,
  phone text not null,
  location text not null,
  need text not null,
  people integer not null check (people > 0),
  details text not null default '',
  urgent boolean not null default false,
  consent boolean not null default false,
  status text not null default 'รอประสานงาน'
    check (status in ('รอประสานงาน', 'กำลังดำเนินการ', 'ช่วยเหลือแล้ว')),
  created_at timestamptz not null default now()
);

create table if not exists public.flood_reports (
  id text primary key,
  area text not null,
  village text not null,
  moo text not null default '',
  subdistrict text not null,
  district text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null check (status in ('ปกติ', 'เฝ้าระวัง', 'เสี่ยงสูง', 'วิกฤต')),
  water_level text not null default '',
  details text not null default '',
  image_url text not null default '',
  video_url text not null default '',
  image_name text not null default '',
  video_name text not null default '',
  verified boolean not null default false,
  verified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_shelters (
  id text primary key,
  name text not null,
  location text not null,
  occupancy integer not null default 0 check (occupancy >= 0),
  capacity integer not null check (capacity > 0),
  facilities text not null default '',
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (occupancy <= capacity)
);

create table if not exists public.relief_supplies (
  id text primary key,
  name text not null,
  category text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  unit text not null,
  status text not null default 'พร้อมจ่าย',
  created_at timestamptz not null default now()
);

create table if not exists public.volunteer_teams (
  id text primary key,
  name text not null,
  status text not null default 'พร้อมสนับสนุน',
  mission text not null default '',
  headcount integer not null default 0 check (headcount >= 0),
  equipment text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.public_announcements (
  id text primary key,
  title text not null,
  tag text not null,
  details text not null,
  is_published boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;
alter table public.help_requests enable row level security;
alter table public.flood_reports enable row level security;
alter table public.emergency_shelters enable row level security;
alter table public.relief_supplies enable row level security;
alter table public.volunteer_teams enable row level security;
alter table public.public_announcements enable row level security;

grant select on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.help_requests to anon, authenticated;
grant select, insert, update, delete on public.flood_reports to anon, authenticated;
grant select, insert, update, delete on public.emergency_shelters to anon, authenticated;
grant select, insert, update, delete on public.relief_supplies to anon, authenticated;
grant select, insert, update, delete on public.volunteer_teams to anon, authenticated;
grant select, insert, update, delete on public.public_announcements to anon, authenticated;

create policy "admins read their own profile or superadmins read all"
on public.admin_profiles for select to authenticated
using (user_id = (select auth.uid()) or public.has_module_access('admin-users'));

create policy "public can submit help requests"
on public.help_requests for insert to anon, authenticated
with check (consent and status = 'รอประสานงาน');
create policy "assigned admins can add help requests"
on public.help_requests for insert to authenticated
with check (public.has_module_access('requests'));
create policy "assigned admins read help requests"
on public.help_requests for select to authenticated
using (public.has_module_access('requests'));
create policy "assigned admins update help requests"
on public.help_requests for update to authenticated
using (public.has_module_access('requests'))
with check (public.has_module_access('requests'));
create policy "assigned admins delete help requests"
on public.help_requests for delete to authenticated
using (public.has_module_access('requests'));

create policy "public can report flood conditions"
on public.flood_reports for insert to anon, authenticated
with check (not verified and created_by is null);
create policy "assigned admins can add flood reports"
on public.flood_reports for insert to authenticated
with check (public.has_module_access('flood-monitor'));
create policy "public read verified flood reports"
on public.flood_reports for select to anon, authenticated
using (verified or public.has_module_access('flood-monitor') or public.has_module_access('map'));
create policy "assigned admins update flood reports"
on public.flood_reports for update to authenticated
using (public.has_module_access('flood-monitor'))
with check (public.has_module_access('flood-monitor'));
create policy "assigned admins delete flood reports"
on public.flood_reports for delete to authenticated
using (public.has_module_access('flood-monitor'));

create policy "public read active published shelters"
on public.emergency_shelters for select to anon, authenticated
using ((is_active and is_published) or public.has_module_access('shelters') or public.has_module_access('map'));
create policy "assigned admins add shelters"
on public.emergency_shelters for insert to authenticated
with check (public.has_module_access('shelters'));
create policy "assigned admins update shelters"
on public.emergency_shelters for update to authenticated
using (public.has_module_access('shelters'))
with check (public.has_module_access('shelters'));
create policy "assigned admins delete shelters"
on public.emergency_shelters for delete to authenticated
using (public.has_module_access('shelters'));

create policy "assigned admins read relief supplies"
on public.relief_supplies for select to authenticated
using (public.has_module_access('supplies'));
create policy "assigned admins add relief supplies"
on public.relief_supplies for insert to authenticated
with check (public.has_module_access('supplies'));
create policy "assigned admins update relief supplies"
on public.relief_supplies for update to authenticated
using (public.has_module_access('supplies'))
with check (public.has_module_access('supplies'));
create policy "assigned admins delete relief supplies"
on public.relief_supplies for delete to authenticated
using (public.has_module_access('supplies'));

create policy "assigned admins read volunteer teams"
on public.volunteer_teams for select to authenticated
using (public.has_module_access('volunteers'));
create policy "assigned admins add volunteer teams"
on public.volunteer_teams for insert to authenticated
with check (public.has_module_access('volunteers'));
create policy "assigned admins update volunteer teams"
on public.volunteer_teams for update to authenticated
using (public.has_module_access('volunteers'))
with check (public.has_module_access('volunteers'));
create policy "assigned admins delete volunteer teams"
on public.volunteer_teams for delete to authenticated
using (public.has_module_access('volunteers'));

create policy "public read published announcements"
on public.public_announcements for select to anon, authenticated
using (
  (is_published and (expires_at is null or expires_at > now()))
  or public.has_module_access('announcements')
);
create policy "assigned admins add announcements"
on public.public_announcements for insert to authenticated
with check (public.has_module_access('announcements'));
create policy "assigned admins update announcements"
on public.public_announcements for update to authenticated
using (public.has_module_access('announcements'))
with check (public.has_module_access('announcements'));
create policy "assigned admins delete announcements"
on public.public_announcements for delete to authenticated
using (public.has_module_access('announcements'));
