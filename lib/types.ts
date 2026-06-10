// VoltAdvance v3.0 — TypeScript Types (mirrors SQL schema exactly)

export type RiskTier = 'DECLINED' | 'BASIC' | 'STANDARD' | 'PREMIUM';
export type MeterStatus = 'ACTIVE' | 'INACTIVE' | 'FLAGGED';
export type AdvanceStatus = 'ACTIVE' | 'PARTIALLY_REPAID' | 'SETTLED' | 'DEFAULTED' | 'BLOCKED';
export type VendingIntegrationType = 'SWITCH_INTERCEPT' | 'PASSTHROUGH_ONLY';
export type ClearingStatus = 'NOMINAL' | 'BLOCKED' | 'RESTRICTED';
export type RecoveryChannel = 'BOXER' | 'FNB' | 'CAPITEC' | 'SHOPRITE' | 'API' | 'WHATSAPP' | 'VENDOR' | 'BANK_APP' | 'RETAIL';
export type RecoveryEventType = 'INTERCEPT' | 'PARTIAL' | 'FULL' | 'FAILED' | 'REVERSAL';
export type RelationshipType = 'USER' | 'LANDLORD' | 'TENANT' | 'THIRD_PARTY';
export type IssuedVia = 'WHATSAPP' | 'LANDLORD' | 'API' | 'AGENT';

// 1. Intercept Partner Configurations
export interface InterceptPartnerConfiguration {
  id: string;
  partner_name: string;
  hmac_secret: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// 2. Physical Meters
export interface PhysicalMeter {
  id: string;
  meter_number: string;
  provider_name?: string;
  external_reference?: string;
  status: MeterStatus;
  vending_integration_type: VendingIntegrationType;
  clearing_status: ClearingStatus;
  total_outstanding_cents: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

// Alias for backwards compatibility
export type Meter = PhysicalMeter;

// 3. Debt Obligors
export interface DebtObligor {
  id: string;
  phone_number: string;
  trust_score: number;          // 0–100
  risk_tier: RiskTier;
  total_active_exposure_cents: number;
  total_repaid_cents: number;
  created_at: string;
  updated_at: string;
}

// Alias for backwards compatibility
export type Borrower = DebtObligor;

// 4. Utility Obligation Maps
export interface UtilityObligationMap {
  id: string;
  meter_id: string;
  borrower_id: string;
  relationship_type: RelationshipType;
  active: boolean;
  active_from: string;
  active_to?: string;
  last_seen_at: string;
}

// Alias for backwards compatibility
export type MeterBorrowerLink = UtilityObligationMap;

// 5. Clearing Ledger Accounts
export interface ClearingLedgerAccount {
  id: string;
  account_name: 'ASSET_RECEIVABLE' | 'CLEARING_ESCROW' | 'REVENUE_FEE';
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

// 6. Credit Advances
export interface CreditAdvance {
  id: string;
  advance_reference: string;     // e.g. ADV-0042-01
  borrower_id: string;
  meter_id: string;
  principal_cents: number;
  fee_cents: number;
  outstanding_cents: number;
  repaid_cents: number;
  status: AdvanceStatus;
  issued_via?: IssuedVia;
  consent_snapshot: boolean;
  created_at: string;
  updated_at: string;
  // joined fields
  borrower?: DebtObligor;
  meter?: PhysicalMeter;
}

// Alias for backwards compatibility
export type Advance = CreditAdvance;

// 7. Ledger Journal Entries
export interface LedgerJournalEntry {
  id: string;
  advance_id?: string;
  meter_id: string;
  debit_account_id?: string;
  credit_account_id?: string;
  amount_cents: number;
  channel: RecoveryChannel;
  event_type: RecoveryEventType;
  external_transaction_id?: string;
  created_at: string;
  // joined
  advance?: CreditAdvance;
  meter?: PhysicalMeter;
  // compatibility helpers
  advance_ref?: string;
  meter_number?: string;
}

// Alias for backwards compatibility
export type RecoveryTransaction = LedgerJournalEntry;

// 8. Integration Intercept Events
export interface IntegrationInterceptEvent {
  id: string;
  meter_id: string;
  partner_id?: string;
  amount_cents: number;
  channel: RecoveryChannel;
  external_transaction_id?: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  clearing_status?: 'APPLY_RECOVERY_SPLIT' | 'PROCEED_NOMINAL' | 'FAILED';
  created_at: string;
  // compatibility helpers
  meter_number?: string;
}

// Alias for backwards compatibility
export type MeterPurchase = IntegrationInterceptEvent;

// 9. System Events
export interface SystemEvent {
  id: string;
  event_type: string;
  reference_id?: string;
  reference_type?: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

// Risk Engine types
export interface RiskEvaluation {
  trust_score: number;
  risk_tier: RiskTier;
  advance_limit_cents: number;
  approved: boolean;
  reason?: string;
}

// Recovery Engine types
export interface RecoveryResult {
  purchase_amount_cents: number;
  debt_recovered_cents: number;
  electricity_amount_cents: number;
  advance_status: AdvanceStatus;
  scenario: 'BORROWER' | 'THIRD_PARTY' | 'NO_DEBT';
}

// Dashboard metrics
export interface DashboardMetrics {
  total_advances_issued: number;
  total_outstanding_cents: number;
  total_recovered_today_cents: number;
  recovery_rate: number;
  active_meters: number;
  active_borrowers: number;
  default_rate: number;
  fraud_alerts: number;
}
