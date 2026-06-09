// VoltAdvance — TypeScript Types (mirrors SQL schema exactly)

export type RiskTier = 'DECLINED' | 'BASIC' | 'STANDARD' | 'PREMIUM';
export type MeterStatus = 'ACTIVE' | 'INACTIVE' | 'FLAGGED';
export type AdvanceStatus = 'ACTIVE' | 'PARTIALLY_REPAID' | 'SETTLED' | 'DEFAULTED' | 'BLOCKED';
export type RecoveryChannel = 'BOXER' | 'FNB' | 'CAPITEC' | 'SHOPRITE' | 'API' | 'WHATSAPP' | 'VENDOR' | 'BANK_APP' | 'RETAIL';
export type RecoveryEventType = 'INTERCEPT' | 'PARTIAL' | 'FULL' | 'FAILED' | 'REVERSAL';
export type RelationshipType = 'USER' | 'LANDLORD' | 'TENANT' | 'THIRD_PARTY';
export type IssuedVia = 'WHATSAPP' | 'LANDLORD' | 'API' | 'AGENT';

export interface Borrower {
  id: string;
  phone_number: string;
  trust_score: number;          // 0–100
  risk_tier: RiskTier;
  total_active_exposure_cents: number;
  total_repaid_cents: number;
  created_at: string;
  updated_at: string;
}

export interface Meter {
  id: string;
  meter_number: string;
  provider_name?: string;
  external_reference?: string;
  status: MeterStatus;
  total_outstanding_cents: number;
  last_activity_at?: string;
  created_at: string;
}

export interface MeterBorrowerLink {
  id: string;
  meter_id: string;
  borrower_id: string;
  relationship_type: RelationshipType;
  active: boolean;
  active_from: string;
  active_to?: string;
  last_seen_at: string;
}

export interface Advance {
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
  borrower?: Borrower;
  meter?: Meter;
}

export interface RecoveryTransaction {
  id: string;
  advance_id: string;
  meter_id: string;
  amount_cents: number;
  channel: RecoveryChannel;
  event_type: RecoveryEventType;
  external_transaction_id?: string;
  created_at: string;
  // joined
  advance?: Advance;
  meter?: Meter;
}

export interface MeterPurchase {
  id: string;
  meter_id: string;
  amount_cents: number;
  channel: RecoveryChannel;
  external_transaction_id?: string;
  created_at: string;
}

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
