-- Create profiles table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  cpf text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- RLS policies for profiles
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Create user_subscriptions table
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_type text not null check (plan_type in ('bronze', 'prata', 'ouro')),
  status text not null check (status in ('active', 'canceled', 'expired', 'past_due')),
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, status)
);

-- Enable RLS on user_subscriptions
alter table public.user_subscriptions enable row level security;

-- RLS policies for user_subscriptions
create policy "Users can view their own subscriptions"
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger update_user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row
  execute function public.handle_updated_at();

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();