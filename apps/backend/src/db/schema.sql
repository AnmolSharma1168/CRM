-- ============================================================
-- XenoCRM — Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- customers
-- ============================================================
create table if not exists customers (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  email           text unique not null,
  phone           text not null,
  city            text not null,
  total_spent     numeric(12, 2) not null default 0,
  order_count     integer not null default 0,
  last_order_date date,
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_customers_city on customers(city);
create index if not exists idx_customers_total_spent on customers(total_spent);
create index if not exists idx_customers_last_order_date on customers(last_order_date);

-- ============================================================
-- orders
-- ============================================================
create table if not exists orders (
  id              uuid primary key default uuid_generate_v4(),
  customer_id     uuid not null references customers(id) on delete cascade,
  amount          numeric(10, 2) not null,
  product_name    text not null,
  category        text not null,
  order_date      date not null,
  channel         text not null check (channel in ('online', 'in-store', 'app', 'phone')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_orders_order_date on orders(order_date);
create index if not exists idx_orders_category on orders(category);

-- ============================================================
-- segments
-- ============================================================
create table if not exists segments (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,
  natural_language_query  text not null,
  sql_filter              text not null,
  customer_count          integer not null default 0,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- campaigns
-- ============================================================
create table if not exists campaigns (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  segment_id      uuid references segments(id) on delete set null,
  channel         text not null check (channel in ('whatsapp', 'sms', 'email', 'rcs')),
  message_content text not null,
  status          text not null default 'draft'
                    check (status in ('draft', 'scheduled', 'running', 'completed', 'failed')),
  scheduled_at    timestamptz,
  launched_at     timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_campaigns_status on campaigns(status);
create index if not exists idx_campaigns_segment_id on campaigns(segment_id);

-- ============================================================
-- communications
-- ============================================================
create table if not exists communications (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  channel         text not null check (channel in ('whatsapp', 'sms', 'email', 'rcs')),
  message         text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'sent', 'delivered', 'opened', 'read', 'clicked', 'failed')),
  sent_at         timestamptz,
  delivered_at    timestamptz,
  opened_at       timestamptz,
  read_at         timestamptz,
  clicked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_communications_campaign_id on communications(campaign_id);
create index if not exists idx_communications_customer_id on communications(customer_id);
create index if not exists idx_communications_status on communications(status);

-- ============================================================
-- campaign_stats
-- ============================================================
create table if not exists campaign_stats (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid unique not null references campaigns(id) on delete cascade,
  total_sent      integer not null default 0,
  total_delivered integer not null default 0,
  total_failed    integer not null default 0,
  total_opened    integer not null default 0,
  total_clicked   integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- Helper function: update campaign_stats from communications
-- Called by trigger after each communications status change
-- ============================================================
create or replace function refresh_campaign_stats(p_campaign_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into campaign_stats (campaign_id, total_sent, total_delivered, total_failed, total_opened, total_clicked, updated_at)
  select
    p_campaign_id,
    count(*) filter (where status != 'pending'),
    count(*) filter (where status in ('delivered', 'opened', 'read', 'clicked')),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status in ('opened', 'read', 'clicked')),
    count(*) filter (where status = 'clicked')
  from communications
  where campaign_id = p_campaign_id
  on conflict (campaign_id) do update set
    total_sent      = excluded.total_sent,
    total_delivered = excluded.total_delivered,
    total_failed    = excluded.total_failed,
    total_opened    = excluded.total_opened,
    total_clicked   = excluded.total_clicked,
    updated_at      = now();
end;
$$;

-- ============================================================
-- RPC: execute_segment_query
-- Safely run AI-generated WHERE clause against customers table
-- ============================================================
create or replace function execute_segment_query(where_clause text)
returns table(id uuid, name text, email text, phone text, city text, 
              total_spent numeric, order_count integer, last_order_date date,
              tags text[], created_at timestamptz)
language plpgsql
security definer
as $$
begin
  return query execute
    'select id, name, email, phone, city, total_spent, order_count, 
            last_order_date, tags, created_at 
     from customers 
     where ' || where_clause;
end;
$$;

-- RPC: count_segment_query
create or replace function count_segment_query(where_clause text)
returns bigint
language plpgsql
security definer
as $$
declare
  result bigint;
begin
  execute 'select count(*) from customers where ' || where_clause into result;
  return result;
end;
$$;
