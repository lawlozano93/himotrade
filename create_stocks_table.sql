-- Create the stocks table
create table if not exists stocks (
  symbol text primary key,
  name text not null,
  market text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index on market
create index if not exists idx_stocks_market on stocks(market);

-- Enable RLS
alter table stocks enable row level security;

-- Create policies
create policy "Allow read access for authenticated users"
  on stocks for select
  to authenticated
  using (true);

create policy "Allow insert/update for service_role only"
  on stocks for all
  to service_role
  using (true)
  with check (true); 