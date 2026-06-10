-- =========================================================
-- VOLTADVANCE v3.0 — CORE DATABASE SCHEMA
-- =========================================================

create extension if not exists "uuid-ossp";

-- 1. INTERCEPT PARTNER CONFIGURATIONS
create table if not exists intercept_partner_configurations (
    id uuid primary key default uuid_generate_v4(),
    partner_name varchar(50) unique not null,
    hmac_secret varchar(255) not null,
    active boolean not null default true,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- 2. PHYSICAL METERS (REPLACES METERS)
create table if not exists physical_meters (
    id uuid primary key default uuid_generate_v4(),
    meter_number varchar(30) unique not null,
    provider_name varchar(50),
    external_reference varchar(50),
    status varchar(20) not null default 'ACTIVE',
    vending_integration_type varchar(30) not null default 'SWITCH_INTERCEPT', -- SWITCH_INTERCEPT or PASSTHROUGH_ONLY
    clearing_status varchar(30) not null default 'NOMINAL', -- NOMINAL, BLOCKED, RESTRICTED
    total_outstanding_cents integer not null default 0,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_physical_meters_number on physical_meters(meter_number);

-- 3. DEBT OBLIGORS (REPLACES BORROWERS)
create table if not exists debt_obligors (
    id uuid primary key default uuid_generate_v4(),
    phone_number varchar(20) unique not null,
    trust_score integer not null default 50 check (trust_score between 0 and 100),
    risk_tier varchar(20) not null default 'STANDARD',
    total_active_exposure_cents integer not null default 0,
    total_repaid_cents integer not null default 0,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_debt_obligors_phone on debt_obligors(phone_number);

-- 4. UTILITY OBLIGATION MAPS (REPLACES METER_BORROWER_LINKS)
create table if not exists utility_obligation_maps (
    id uuid primary key default uuid_generate_v4(),
    meter_id uuid references physical_meters(id) on delete cascade not null,
    borrower_id uuid references debt_obligors(id) on delete cascade not null,
    relationship_type varchar(20) default 'USER',
    active boolean not null default true,
    active_from timestamp with time zone default timezone('utc', now()) not null,
    active_to timestamp with time zone,
    last_seen_at timestamp with time zone default timezone('utc', now()) not null,
    constraint unique_meter_obligor_active unique (meter_id, borrower_id, active)
);

create index if not exists idx_obligation_meter on utility_obligation_maps(meter_id);
create index if not exists idx_obligation_obligor on utility_obligation_maps(borrower_id);

-- 5. CLEARING LEDGER ACCOUNTS (DOUBLE-ENTRY)
create table if not exists clearing_ledger_accounts (
    id uuid primary key default uuid_generate_v4(),
    account_name varchar(50) unique not null, -- ASSET_RECEIVABLE, CLEARING_ESCROW, REVENUE_FEE
    balance_cents integer not null default 0,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- 6. CREDIT ADVANCES (REPLACES ADVANCES)
create table if not exists credit_advances (
    id uuid primary key default uuid_generate_v4(),
    advance_reference varchar(20) unique not null,
    borrower_id uuid references debt_obligors(id) not null,
    meter_id uuid references physical_meters(id) not null,
    principal_cents integer not null check (principal_cents > 0),
    fee_cents integer not null default 0,
    outstanding_cents integer not null check (outstanding_cents >= 0),
    repaid_cents integer not null default 0,
    status varchar(20) not null default 'ACTIVE', -- ACTIVE, PARTIALLY_REPAID, SETTLED, DEFAULTED, BLOCKED
    issued_via varchar(30),
    consent_snapshot boolean not null default true,
    created_at timestamp with time zone default timezone('utc', now()) not null,
    updated_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_credit_advances_meter on credit_advances(meter_id);
create index if not exists idx_credit_advances_obligor on credit_advances(borrower_id);
create index if not exists idx_credit_advances_status on credit_advances(status);

-- 7. LEDGER JOURNAL ENTRIES (DOUBLE-ENTRY, REPLACES RECOVERY_TRANSACTIONS)
create table if not exists ledger_journal_entries (
    id uuid primary key default uuid_generate_v4(),
    advance_id uuid references credit_advances(id),
    meter_id uuid references physical_meters(id) not null,
    debit_account_id uuid references clearing_ledger_accounts(id),
    credit_account_id uuid references clearing_ledger_accounts(id),
    amount_cents integer not null check (amount_cents > 0),
    channel varchar(30) not null,
    event_type varchar(30) not null, -- INTERCEPT, PARTIAL, FULL, FAILED, REVERSAL
    external_transaction_id varchar(80),
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_journal_meter on ledger_journal_entries(meter_id);
create index if not exists idx_journal_advance on ledger_journal_entries(advance_id);

-- 8. INTEGRATION INTERCEPT EVENTS (REPLACES METER_PURCHASES)
create table if not exists integration_intercept_events (
    id uuid primary key default uuid_generate_v4(),
    meter_id uuid references physical_meters(id) not null,
    partner_id uuid references intercept_partner_configurations(id),
    amount_cents integer not null,
    channel varchar(30) not null,
    external_transaction_id varchar(80),
    request_payload jsonb,
    response_payload jsonb,
    clearing_status varchar(30), -- APPLY_RECOVERY_SPLIT, PROCEED_NOMINAL, FAILED
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_intercept_event_meter on integration_intercept_events(meter_id);

-- 9. SYSTEM EVENTS
create table if not exists system_events (
    id uuid primary key default uuid_generate_v4(),
    event_type varchar(50) not null,
    reference_id uuid,
    reference_type varchar(30),
    payload jsonb,
    created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists idx_sys_events_type on system_events(event_type);

-- 10. EXPOSURE VIEW
create or replace view view_meter_current_exposure as
select 
    m.id as meter_id,
    m.meter_number,
    m.vending_integration_type,
    coalesce(sum(a.outstanding_cents), 0) as total_outstanding_cents,
    count(a.id) filter (where a.status in ('ACTIVE', 'PARTIALLY_REPAID')) as active_advances_count
from physical_meters m
left join credit_advances a on a.meter_id = m.id and a.status in ('ACTIVE', 'PARTIALLY_REPAID')
group by m.id, m.meter_number, m.vending_integration_type;


-- =========================================================
-- SEED INITIAL CONFIGURATIONS
-- =========================================================
insert into clearing_ledger_accounts (account_name, balance_cents)
values 
    ('ASSET_RECEIVABLE', 0),
    ('CLEARING_ESCROW', 0),
    ('REVENUE_FEE', 0)
on conflict (account_name) do nothing;

insert into intercept_partner_configurations (partner_name, hmac_secret, active)
values 
    ('NETVENDOR', 'netvendor_secret_key_12345', true),
    ('METRO_PREPAID', 'metro_secret_key_12345', true)
on conflict (partner_name) do nothing;


-- =========================================================
-- 11. TRANSACTION CLEARING ENGINE FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION execute_purchase_clearing_v1(
    p_meter_number VARCHAR,
    p_purchase_amount_cents INTEGER,
    p_channel VARCHAR,
    p_external_transaction_id VARCHAR,
    p_is_borrower_purchasing BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    v_meter_id UUID;
    v_borrower_id UUID;
    v_outstanding_debt INTEGER := 0;
    v_recovered_debt INTEGER := 0;
    v_recovered_debt_applied INTEGER := 0;
    v_electricity_amount INTEGER := 0;
    v_scenario VARCHAR;
    v_advance_status VARCHAR;
    v_advance_rec RECORD;
    v_deduction INTEGER;
    v_tx_id UUID;
    
    v_ar_account_id UUID;
    v_ce_account_id UUID;
    
    v_sys_event_id UUID;
    v_result JSONB;
BEGIN
    -- Get Ledger account IDs
    SELECT id INTO v_ar_account_id FROM clearing_ledger_accounts WHERE account_name = 'ASSET_RECEIVABLE';
    SELECT id INTO v_ce_account_id FROM clearing_ledger_accounts WHERE account_name = 'CLEARING_ESCROW';

    -- 1. Find or create the meter
    SELECT id, total_outstanding_cents INTO v_meter_id, v_outstanding_debt
    FROM physical_meters
    WHERE meter_number = p_meter_number;

    IF v_meter_id IS NULL THEN
        INSERT INTO physical_meters (meter_number, provider_name, status, vending_integration_type, total_outstanding_cents)
        VALUES (p_meter_number, 'City Power', 'ACTIVE', 'SWITCH_INTERCEPT', 0)
        RETURNING id, total_outstanding_cents INTO v_meter_id, v_outstanding_debt;
    END IF;

    -- 2. Insert raw purchase record (integration intercept event)
    INSERT INTO integration_intercept_events (meter_id, amount_cents, channel, external_transaction_id)
    VALUES (v_meter_id, p_purchase_amount_cents, p_channel, p_external_transaction_id)
    RETURNING id INTO v_tx_id;

    -- 3. Calculate recovery scenario (Enforce 50% Recovery Split Rule)
    IF v_outstanding_debt = 0 THEN
        v_electricity_amount := p_purchase_amount_cents;
        v_recovered_debt := 0;
        v_scenario := 'NO_DEBT';
        v_advance_status := 'NONE';
    ELSE
        -- Recovery Split Cap: Max 50% of the gross vending purchase value
        v_recovered_debt := LEAST(v_outstanding_debt, FLOOR(p_purchase_amount_cents * 0.5));
        v_electricity_amount := p_purchase_amount_cents - v_recovered_debt;
        
        IF v_recovered_debt = v_outstanding_debt THEN
            v_scenario := 'FULL_RECOVERY';
            v_advance_status := 'SETTLED';
        ELSE
            v_scenario := 'PARTIAL_RECOVERY';
            v_advance_status := 'PARTIALLY_REPAID';
        END IF;

        -- 4. Mutate advances and insert journal logs sequentially
        FOR v_advance_rec IN (
            SELECT id, outstanding_cents, advance_reference, borrower_id
            FROM credit_advances
            WHERE meter_id = v_meter_id AND status IN ('ACTIVE', 'PARTIALLY_REPAID')
            ORDER BY created_at ASC
        ) LOOP
            IF v_recovered_debt - v_recovered_debt_applied <= 0 THEN
                EXIT;
            END IF;

            v_deduction := LEAST(v_advance_rec.outstanding_cents, v_recovered_debt - v_recovered_debt_applied);
            v_recovered_debt_applied := v_recovered_debt_applied + v_deduction;
            
            -- Update advance record
            UPDATE credit_advances
            SET 
                repaid_cents = repaid_cents + v_deduction,
                outstanding_cents = outstanding_cents - v_deduction,
                status = CASE WHEN (outstanding_cents - v_deduction) <= 0 THEN 'SETTLED' ELSE 'PARTIALLY_REPAID' END,
                updated_at = now()
            WHERE id = v_advance_rec.id;

            -- Update debt obligor total metrics
            UPDATE debt_obligors
            SET 
                total_active_exposure_cents = GREATEST(0, total_active_exposure_cents - v_deduction),
                total_repaid_cents = total_repaid_cents + v_deduction,
                updated_at = now()
            WHERE id = v_advance_rec.borrower_id;

            -- Insert Ledger Journal Entry (Double-Entry Debit Asset, Credit Clearing Escrow)
            INSERT INTO ledger_journal_entries (
                advance_id, meter_id, debit_account_id, credit_account_id, 
                amount_cents, channel, event_type, external_transaction_id
            )
            VALUES (
                v_advance_rec.id, 
                v_meter_id, 
                v_ce_account_id, -- debit clearing escrow (receives collected cash)
                v_ar_account_id, -- credit asset receivable (reduces outstanding debt)
                v_deduction, 
                p_channel, 
                CASE WHEN (v_advance_rec.outstanding_cents - v_deduction) <= 0 THEN 'FULL' ELSE 'PARTIAL' END,
                p_external_transaction_id
            );

            -- Adjust actual balances in ledger accounts
            UPDATE clearing_ledger_accounts SET balance_cents = balance_cents - v_deduction WHERE id = v_ar_account_id;
            UPDATE clearing_ledger_accounts SET balance_cents = balance_cents + v_deduction WHERE id = v_ce_account_id;
        END LOOP;

        -- Update meter total outstanding
        UPDATE physical_meters
        SET 
            total_outstanding_cents = GREATEST(0, total_outstanding_cents - v_recovered_debt),
            last_activity_at = now()
        WHERE id = v_meter_id;
    END IF;

    -- Update the audit event with final outcomes
    UPDATE integration_intercept_events
    SET 
        clearing_status = CASE WHEN v_recovered_debt > 0 THEN 'APPLY_RECOVERY_SPLIT' ELSE 'PROCEED_NOMINAL' END,
        response_payload = jsonb_build_object(
            'action', CASE WHEN v_recovered_debt > 0 THEN 'APPLY_RECOVERY_SPLIT' ELSE 'PROCEED_NOMINAL' END,
            'deduct_amount_cents', v_recovered_debt,
            'forward_vending_amount_cents', v_electricity_amount
        )
    WHERE id = v_tx_id;

    -- 5. Insert system event for operations stream
    INSERT INTO system_events (event_type, reference_id, reference_type, payload)
    VALUES (
        'RECOVERY_APPLIED',
        v_tx_id,
        'purchase',
        jsonb_build_object(
            'meter_number', p_meter_number,
            'purchase_amount_cents', p_purchase_amount_cents,
            'debt_recovered_cents', v_recovered_debt,
            'electricity_amount_cents', v_electricity_amount,
            'scenario', v_scenario
        )
    )
    RETURNING id INTO v_sys_event_id;

    -- Return JSON payload of the result
    v_result := jsonb_build_object(
        'success', TRUE,
        'meter_number', p_meter_number,
        'scenario', v_scenario,
        'purchase_amount_cents', p_purchase_amount_cents,
        'debt_recovered_cents', v_recovered_debt,
        'electricity_amount_cents', v_electricity_amount,
        'remaining_outstanding_cents', GREATEST(0, v_outstanding_debt - v_recovered_debt)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
