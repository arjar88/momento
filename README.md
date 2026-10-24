# Keepsakes

A quiet album for the days you want to keep. Photos stay on the day they were taken.

## Run

```bash
npm install
npx expo start
```

Copy `.env.example` to `.env` and set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Use the anon key. Do not put a service-role key in the app. Without those variables the app still opens and explains what to add.

Apply `supabase/migrations/20261023120000_init.sql` in the Supabase SQL editor. It creates the tables, triggers, row-level security, and the private `memories` bucket.

Invites match an email to an existing account or wait until that person signs up. This version does not send email.
