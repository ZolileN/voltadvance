-- =========================================================
-- VOLTADVANCE — FULL DATABASE SCHEMA
-- =========================================================

create extension if not exists "uuid-ossp";

-- =========================================================
-- 1. BORROWERS (IDENTITY LAYER - PHONE BASED)
-- =========================================================
create table if not exists borrowers (
    id uuid primary key default uuid_generate_v4(),
    phone_number varchar(20) unique not null,
    trust_score integer not null default 50 check (trust_score between 0 and 100),
    risk_tier varchar(20) not null default 'STANDARD',
    total_active_exposure_cents integer not null default 0,
    total_repaid_cents integer not null default 0,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_borrowers_phone on borrowers(phone_number);

-- =========================================================
-- 2. METERS (RECOVERY ASSET LAYER)
-- =========================================================
create table if not exists meters (
    id uuid primary key default uuid_generate_v4(),
    meter_number varchar(30) unique not null,
    provider_name varchar(50),
    external_reference varchar(50),
    status varchar(20) not null default 'ACTIVE',
    total_outstanding_cents integer not null default 0,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_meters_number on meters(meter_number);

-- =========================================================
-- 3. BORROWER ↔ METER RELATIONSHIP
-- =========================================================
create table if not exists meter_borrower_links (
    id uuid primary key default uuid_generate_v4(),
    meter_id uuid references meters(id) on delete cascade not null,
    borrower_id uuid references borrowers(id) on delete cascade not null,
    relationship_type varchar(20) default 'USER',
    active boolean not null default true,
    active_from timestamp with time zone default timezone('utc', now()) not null,
    active_to timestamp with time zone,
    last_seen_at timestamp with time zone default timezone('utc', now()) not null,
    constraint unique_meter_borrower_active unique (meter_id, borrower_id, active)
);

create index if not exists idx_link_meter on meter_borrower_links(meter_id);
create index if not exists idx_link_borrower on meter_borrower_links(borrower_id);

-- =========================================================
-- 4. ADVANCES (CREDIT INSTRUMENTS / LEDGER)
-- =========================================================
create table if not exists advances (
    id uuid primary key default uuid_generate_v4(),
    advance_reference varchar(20) unique not null,
    borrower_id uuid references borrowers(id) not null,
    meter_id uuid references meters(id) not null,
    principal_cents integer not null check (principal_cents > 0),
    fee_cents integer not null default 0,
    outstanding_cents integer not null check (outstanding_cents >= 0),
    repaid_cents integer not null default 0,
    status varchar(20) not null default 'ACTIVE',
    issued_via varchar(30),
    consent_snapshot boolean not null default true,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_advances_meter on advances(meter_id);
create index if not exists idx_advances_borrower on advances(borrower_id);
create index if not exists idx_advances_status on advances(status);

-- =========================================================
-- 5. RECOVERY TRANSACTIONS
-- =========================================================
create table if not exists recovery_transactions (
    id uuid primary key default uuid_generate_v4(),
    advance_id uuid references advances(id) not null,
    meter_id uuid references meters(id) not null,
    amount_cents integer not null check (amount_cents > 0),
    channel varchar(30) not null,
    event_type varchar(30) not null,
    external_transaction_id varchar(80),
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_recovery_meter on recovery_transactions(meter_id);
create index if not exists idx_recovery_advance on recovery_transactions(advance_id);
create index if not exists idx_recovery_external on recovery_transactions(external_transaction_id);

-- =========================================================
-- 6. METER PURCHASE EVENTS
-- =========================================================
create table if not exists meter_purchases (
    id uuid primary key default uuid_generate_v4(),
    meter_id uuid references meters(id) not null,
    amount_cents integer not null,
    channel varchar(30) not null,
    external_transaction_id varchar(80),
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_purchase_meter on meter_purchases(meter_id);

-- =========================================================
-- 7. SYSTEM EVENTS (OBSERVABILITY)
-- =========================================================
create table if not exists system_events (
    id uuid primary key default uuid_generate_v4(),
    event_type varchar(50) not null,
    reference_id uuid,
    reference_type varchar(30),
    payload jsonb,
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_events_type on system_events(event_type);
