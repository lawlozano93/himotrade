-- Create stocks table function
create or replace function create_stocks_table()
returns void
language plpgsql
security definer
as $$
begin
  -- Create the table if it doesn't exist
  create table if not exists stocks (
    symbol text primary key,
    name text not null,
    market text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  -- Create index on market
  create index if not exists idx_stocks_market on stocks(market);

  -- Create RLS policies
  alter table stocks enable row level security;

  -- Allow read access to authenticated users
  create policy "Allow read access for authenticated users"
    on stocks for select
    to authenticated
    using (true);

  -- Allow insert/update access to service_role only
  create policy "Allow insert/update for service_role only"
    on stocks for all
    to service_role
    using (true)
    with check (true);
end;
$$; 