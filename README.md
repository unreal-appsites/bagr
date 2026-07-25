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
  subscription jsonb not null,
  notify_hour int not null default 19 -- hour in UTC (0-23) to send the nightly reminder
);

alter table items enable row level security;
alter table slots enable row level security;
alter table push_subscriptions enable row level security;

create policy "own items" on items for all using (auth.uid() = user_id);
create policy "own slots" on slots for all using (auth.uid() = user_id);
create policy "own push sub" on push_subscriptions for all using (auth.uid() = user_id);
```

Then drop your project URL + anon key into `shared.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

**Already ran this schema before adding notify_hour?** Just run this one line instead of recreating the table:
```sql
alter table push_subscriptions add column notify_hour int not null default 19;
```

## 2. Login — GitHub + magic link

**GitHub OAuth** (no Google Cloud needed):
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage URL: your deployed site. Authorization callback URL: `https://<your-project>.supabase.co/auth/v1/callback`.
3. Supabase dashboard → Authentication → Providers → GitHub → paste client ID + secret, enable.

**Magic link** — no setup required beyond having email/password auth enabled in Supabase (it is by default). Supabase sends the link using its built-in email service. For production volume, swap in your own SMTP under Authentication → Settings → SMTP Settings, since the default sender has low rate limits.

## 3. Push notifications (VAPID keys generated already)

**Public key** is already wired into `today.html`. **Private key** must never go in frontend code — it lives in Supabase as a secret.

**Deploy the Edge Function:**
```bash
npx supabase login
npx supabase link --project-ref dqorsxfqokzuwmuwipov
npx supabase functions deploy send-reminders
```

**Set secrets** (Supabase dashboard → Edge Functions → send-reminders → Secrets, or via CLI):
```bash
npx supabase secrets set VAPID_PUBLIC_KEY=BK_R-3kGaNHd-APrGqj8mrT-Y8xrfGMgjZSx_i7sjf2fyCr6LeppvrR__D6dcsuPHO_bQgJgLdIqyFQPb2VOqQk
npx supabase secrets set VAPID_PRIVATE_KEY=SimNmxLp-YSDTeJlSQ-gV6gR7avYA-L_N7Sn0cK2jTo
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — no need to set those.)

**Schedule it hourly** — since each user now picks their own reminder time (stored as `notify_hour`, in UTC), the function needs to run every hour and only sends to whoever's chosen hour matches right now. Supabase dashboard → Integrations → Cron → Create job:
```sql
select cron.schedule(
  'bagr-hourly-reminder-check',
  '0 * * * *', -- every hour, on the hour
  $$
  select net.http_post(
    url := 'https://dqorsxfqokzuwmuwipov.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || 'YOUR_SERVICE_ROLE_KEY')
  );
  $$
);
```

The function checks the current UTC hour, finds subscriptions matching that `notify_hour`, then checks tomorrow's slots against what's still marked "home" for just those users — no push if nothing's missing.

## 4. Deploy

Static files (`index.html`, `login.html`, `timetable.html`, `items.html`, `today.html`, `shared.css`, `shared.js`, `sw.js`) — deploy as-is to Netlify, same as FWCSTrack. No build step needed.

## 5. Mobile wrapper (optional)

Same Median AppWrap flow you used for FWCSTrack, if you want a home-screen icon on top of the responsive web app.
