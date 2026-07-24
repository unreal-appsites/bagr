# Bagr — setup

## 1. Supabase project

Create a project, then run this in the SQL editor:

```sql
create table items (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  name text not null,
  category text,
  location text not null default 'home' check (location in ('home','away')),
  updated_at timestamptz default now()
);

create table slots (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Mon
  label text not null,
  required_item_ids bigint[] default '{}'
);

create table push_subscriptions (
  user_id uuid references auth.users primary key,
  subscription jsonb not null
);

alter table items enable row level security;
alter table slots enable row level security;
alter table push_subscriptions enable row level security;

create policy "own items" on items for all using (auth.uid() = user_id);
create policy "own slots" on slots for all using (auth.uid() = user_id);
create policy "own push sub" on push_subscriptions for all using (auth.uid() = user_id);
```

Then drop your project URL + anon key into `shared.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

## 2. Google login

1. Google Cloud Console → new OAuth client ID (Web application).
2. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
3. Supabase dashboard → Authentication → Providers → Google → paste client ID + secret, enable.

## 3. Push notifications

1. Generate VAPID keys (e.g. `npx web-push generate-vapid-keys`).
2. Put the public key in `today.html` where `applicationServerKey` is commented out, uncomment that block.
3. Store the private key server-side (Supabase Edge Function secret).
4. Write a scheduled Edge Function (cron, e.g. nightly at 7pm) that:
   - Reads each user's tomorrow's slots + item locations
   - Builds the "what's missing" list (same logic as `itemsNeededForDay` in `shared.js`)
   - Sends a push via `web-push` to each subscription in `push_subscriptions`

## 4. Deploy

Static files (`index.html`, `login.html`, `timetable.html`, `items.html`, `today.html`, `shared.css`, `shared.js`, `sw.js`) — deploy as-is to Netlify, same as FWCSTrack. No build step needed.

## 5. Mobile wrapper (optional)

Same Median AppWrap flow you used for FWCSTrack, if you want a home-screen icon on top of the responsive web app.
