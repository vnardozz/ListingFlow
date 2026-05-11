create table if not exists public.profiles (
  user_id text primary key,
  email text,
  stripe_customer_id text unique,
  subscription_status text not null default 'none',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  property_address text not null,
  bedrooms text not null,
  bathrooms text not null,
  price text not null,
  features jsonb not null,
  target_buyer_type text not null,
  listing_description text not null,
  social_captions jsonb not null,
  drip_sequence jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_created_at_idx
  on public.generations (user_id, created_at desc);
