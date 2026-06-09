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

-- =========================================================
-- 8. PURCHASE CLEARING FUNCTION (TRANSACTIONAL SETTLEMENT)
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
    v_sys_event_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Find or create the meter
    SELECT id, total_outstanding_cents INTO v_meter_id, v_outstanding_debt
    FROM meters
    WHERE meter_number = p_meter_number;

    IF v_meter_id IS NULL THEN
        INSERT INTO meters (meter_number, provider_name, status, total_outstanding_cents)
        VALUES (p_meter_number, 'City Power', 'ACTIVE', 0)
        RETURNING id, total_outstanding_cents INTO v_meter_id, v_outstanding_debt;
    END IF;

    -- 2. Insert raw purchase record
    INSERT INTO meter_purchases (meter_id, amount_cents, channel, external_transaction_id)
    VALUES (v_meter_id, p_purchase_amount_cents, p_channel, p_external_transaction_id)
    RETURNING id INTO v_tx_id;

    -- 3. Calculate recovery scenario
    IF v_outstanding_debt = 0 THEN
        v_electricity_amount := p_purchase_amount_cents;
        v_recovered_debt := 0;
        v_scenario := 'NO_DEBT';
        v_advance_status := 'NONE';
    ELSE
        v_recovered_debt := LEAST(p_purchase_amount_cents, v_outstanding_debt);
        v_electricity_amount := p_purchase_amount_cents - v_recovered_debt;
        
        IF v_recovered_debt = v_outstanding_debt THEN
            v_scenario := 'FULL_RECOVERY';
            v_advance_status := 'SETTLED';
        ELSE
            v_scenario := 'PARTIAL_RECOVERY';
            v_advance_status := 'PARTIALLY_REPAID';
        END IF;

        -- 4. Mutate advances and insert recovery_transactions sequentially
        FOR v_advance_rec IN (
            SELECT id, outstanding_cents, advance_reference, borrower_id
            FROM advances
            WHERE meter_id = v_meter_id AND status IN ('ACTIVE', 'PARTIALLY_REPAID')
            ORDER BY created_at ASC
        ) LOOP
            IF v_recovered_debt - v_recovered_debt_applied <= 0 THEN
                EXIT;
            END IF;

            v_deduction := LEAST(v_advance_rec.outstanding_cents, v_recovered_debt - v_recovered_debt_applied);
            v_recovered_debt_applied := v_recovered_debt_applied + v_deduction;
            
            -- Update advance record
            UPDATE advances
            SET 
                repaid_cents = repaid_cents + v_deduction,
                outstanding_cents = outstanding_cents - v_deduction,
                status = CASE WHEN (outstanding_cents - v_deduction) <= 0 THEN 'SETTLED' ELSE 'PARTIALLY_REPAID' END,
                updated_at = now()
            WHERE id = v_advance_rec.id;

            -- Update borrower total metrics
            UPDATE borrowers
            SET 
                total_active_exposure_cents = GREATEST(0, total_active_exposure_cents - v_deduction),
                total_repaid_cents = total_repaid_cents + v_deduction,
                updated_at = now()
            WHERE id = v_advance_rec.borrower_id;

            -- Insert recovery transaction
            INSERT INTO recovery_transactions (advance_id, meter_id, amount_cents, channel, event_type, external_transaction_id)
            VALUES (
                v_advance_rec.id, 
                v_meter_id, 
                v_deduction, 
                p_channel, 
                CASE WHEN (v_advance_rec.outstanding_cents - v_deduction) <= 0 THEN 'FULL' ELSE 'PARTIAL' END,
                p_external_transaction_id
            );
        END LOOP;

        -- Update meter total outstanding
        UPDATE meters
        SET 
            total_outstanding_cents = GREATEST(0, total_outstanding_cents - v_recovered_debt),
            last_activity_at = now()
        WHERE id = v_meter_id;
    END IF;

    -- 5. Insert system event
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
