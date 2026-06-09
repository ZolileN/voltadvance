import { Borrower, Meter, Advance, RecoveryTransaction, MeterPurchase, SystemEvent, DashboardMetrics } from './types';

// ─────────────────────────────────────────────────────────
// MOCK SEED DATA — VoltAdvance MVP
// All amounts in cents (R1 = 100 cents)
// ─────────────────────────────────────────────────────────

export const mockBorrowers: Borrower[] = [
  {
    id: 'b1', phone_number: '+27821234567', trust_score: 85, risk_tier: 'PREMIUM',
    total_active_exposure_cents: 11000, total_repaid_cents: 85000,
    created_at: '2025-09-01T08:00:00Z', updated_at: '2026-06-08T12:00:00Z',
  },
  {
    id: 'b2', phone_number: '+27839876543', trust_score: 72, risk_tier: 'STANDARD',
    total_active_exposure_cents: 5000, total_repaid_cents: 42000,
    created_at: '2025-11-15T08:00:00Z', updated_at: '2026-06-07T09:00:00Z',
  },
  {
    id: 'b3', phone_number: '+27761112233', trust_score: 54, risk_tier: 'BASIC',
    total_active_exposure_cents: 2000, total_repaid_cents: 12000,
    created_at: '2026-01-20T08:00:00Z', updated_at: '2026-06-05T14:00:00Z',
  },
  {
    id: 'b4', phone_number: '+27844445566', trust_score: 91, risk_tier: 'PREMIUM',
    total_active_exposure_cents: 0, total_repaid_cents: 160000,
    created_at: '2025-07-01T08:00:00Z', updated_at: '2026-06-09T07:30:00Z',
  },
  {
    id: 'b5', phone_number: '+27600001111', trust_score: 33, risk_tier: 'DECLINED',
    total_active_exposure_cents: 10000, total_repaid_cents: 0,
    created_at: '2026-04-10T08:00:00Z', updated_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 'b6', phone_number: '+27722223333', trust_score: 68, risk_tier: 'STANDARD',
    total_active_exposure_cents: 30000, total_repaid_cents: 75000,
    created_at: '2025-10-01T08:00:00Z', updated_at: '2026-06-09T11:00:00Z',
  },
];

export const mockMeters: Meter[] = [
  {
    id: 'm1', meter_number: '123456789', provider_name: 'City Power',
    status: 'ACTIVE', total_outstanding_cents: 11000,
    last_activity_at: '2026-06-08T14:22:00Z', created_at: '2025-08-15T00:00:00Z',
  },
  {
    id: 'm2', meter_number: '987654321', provider_name: 'Eskom',
    status: 'ACTIVE', total_outstanding_cents: 5000,
    last_activity_at: '2026-06-07T09:45:00Z', created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 'm3', meter_number: '555100200', provider_name: 'City Power',
    status: 'ACTIVE', total_outstanding_cents: 0,
    last_activity_at: '2026-06-09T07:12:00Z', created_at: '2025-06-20T00:00:00Z',
  },
  {
    id: 'm4', meter_number: '777300400', provider_name: 'Eskom',
    status: 'FLAGGED', total_outstanding_cents: 10000,
    last_activity_at: '2026-06-01T18:00:00Z', created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'm5', meter_number: '444200100', provider_name: 'Buffalo City',
    status: 'ACTIVE', total_outstanding_cents: 30000,
    last_activity_at: '2026-06-09T11:30:00Z', created_at: '2025-09-12T00:00:00Z',
  },
  {
    id: 'm6', meter_number: '333500600', provider_name: 'eThekwini',
    status: 'INACTIVE', total_outstanding_cents: 0,
    last_activity_at: '2026-05-20T08:00:00Z', created_at: '2025-12-01T00:00:00Z',
  },
];

export const mockAdvances: Advance[] = [
  {
    id: 'a1', advance_reference: 'ADV-0001-01',
    borrower_id: 'b1', meter_id: 'm1',
    principal_cents: 10000, fee_cents: 1000, outstanding_cents: 11000, repaid_cents: 0,
    status: 'ACTIVE', issued_via: 'WHATSAPP', consent_snapshot: true,
    created_at: '2026-06-07T10:00:00Z', updated_at: '2026-06-07T10:00:00Z',
  },
  {
    id: 'a2', advance_reference: 'ADV-0002-01',
    borrower_id: 'b2', meter_id: 'm2',
    principal_cents: 5000, fee_cents: 500, outstanding_cents: 5000, repaid_cents: 0,
    status: 'ACTIVE', issued_via: 'WHATSAPP', consent_snapshot: true,
    created_at: '2026-06-06T14:30:00Z', updated_at: '2026-06-06T14:30:00Z',
  },
  {
    id: 'a3', advance_reference: 'ADV-0003-01',
    borrower_id: 'b4', meter_id: 'm3',
    principal_cents: 10000, fee_cents: 1000, outstanding_cents: 0, repaid_cents: 11000,
    status: 'SETTLED', issued_via: 'WHATSAPP', consent_snapshot: true,
    created_at: '2026-05-28T09:00:00Z', updated_at: '2026-06-02T11:00:00Z',
  },
  {
    id: 'a4', advance_reference: 'ADV-0004-01',
    borrower_id: 'b5', meter_id: 'm4',
    principal_cents: 10000, fee_cents: 1000, outstanding_cents: 10000, repaid_cents: 0,
    status: 'DEFAULTED', issued_via: 'WHATSAPP', consent_snapshot: true,
    created_at: '2026-04-15T08:00:00Z', updated_at: '2026-05-20T00:00:00Z',
  },
  {
    id: 'a5', advance_reference: 'ADV-0005-01',
    borrower_id: 'b6', meter_id: 'm5',
    principal_cents: 30000, fee_cents: 3000, outstanding_cents: 30000, repaid_cents: 0,
    status: 'ACTIVE', issued_via: 'LANDLORD', consent_snapshot: true,
    created_at: '2026-06-09T08:00:00Z', updated_at: '2026-06-09T08:00:00Z',
  },
  {
    id: 'a6', advance_reference: 'ADV-0006-01',
    borrower_id: 'b3', meter_id: 'm2',
    principal_cents: 2000, fee_cents: 200, outstanding_cents: 1200, repaid_cents: 1000,
    status: 'PARTIALLY_REPAID', issued_via: 'WHATSAPP', consent_snapshot: true,
    created_at: '2026-06-01T12:00:00Z', updated_at: '2026-06-05T15:00:00Z',
  },
];

export const mockRecoveryTransactions: RecoveryTransaction[] = [
  {
    id: 'rt1', advance_id: 'a3', meter_id: 'm3',
    amount_cents: 11000, channel: 'CAPITEC', event_type: 'FULL',
    external_transaction_id: 'CAP-TXN-8842', created_at: '2026-06-02T11:00:00Z',
  },
  {
    id: 'rt2', advance_id: 'a6', meter_id: 'm2',
    amount_cents: 1000, channel: 'SHOPRITE', event_type: 'PARTIAL',
    external_transaction_id: 'SHO-TXN-2201', created_at: '2026-06-05T15:00:00Z',
  },
  {
    id: 'rt3', advance_id: 'a1', meter_id: 'm1',
    amount_cents: 11000, channel: 'BOXER', event_type: 'INTERCEPT',
    external_transaction_id: 'BOX-TXN-9901', created_at: '2026-06-09T09:15:00Z',
  },
  {
    id: 'rt4', advance_id: 'a2', meter_id: 'm2',
    amount_cents: 5000, channel: 'FNB', event_type: 'INTERCEPT',
    external_transaction_id: 'FNB-TXN-4421', created_at: '2026-06-09T11:45:00Z',
  },
  {
    id: 'rt5', advance_id: 'a4', meter_id: 'm4',
    amount_cents: 500, channel: 'VENDOR', event_type: 'FAILED',
    external_transaction_id: 'VND-TXN-0012', created_at: '2026-05-10T08:30:00Z',
  },
];

export const mockMeterPurchases: MeterPurchase[] = [
  { id: 'mp1', meter_id: 'm3', amount_cents: 50000, channel: 'CAPITEC', external_transaction_id: 'CAP-TXN-8842', created_at: '2026-06-02T11:00:00Z' },
  { id: 'mp2', meter_id: 'm2', amount_cents: 20000, channel: 'SHOPRITE', external_transaction_id: 'SHO-TXN-2201', created_at: '2026-06-05T15:00:00Z' },
  { id: 'mp3', meter_id: 'm1', amount_cents: 60000, channel: 'BOXER', external_transaction_id: 'BOX-TXN-9901', created_at: '2026-06-09T09:15:00Z' },
  { id: 'mp4', meter_id: 'm2', amount_cents: 30000, channel: 'FNB', external_transaction_id: 'FNB-TXN-4421', created_at: '2026-06-09T11:45:00Z' },
  { id: 'mp5', meter_id: 'm5', amount_cents: 80000, channel: 'BANK_APP', external_transaction_id: 'APP-TXN-5533', created_at: '2026-06-09T11:30:00Z' },
];

export const mockSystemEvents: SystemEvent[] = [
  { id: 'se1', event_type: 'ADVANCE_ISSUED', reference_id: 'a5', reference_type: 'advance', payload: { amount: 30000, meter: '444200100' }, created_at: '2026-06-09T08:00:00Z' },
  { id: 'se2', event_type: 'RECOVERY_APPLIED', reference_id: 'rt4', reference_type: 'recovery', payload: { amount: 5000, channel: 'FNB' }, created_at: '2026-06-09T11:45:00Z' },
  { id: 'se3', event_type: 'RECOVERY_APPLIED', reference_id: 'rt3', reference_type: 'recovery', payload: { amount: 11000, channel: 'BOXER' }, created_at: '2026-06-09T09:15:00Z' },
  { id: 'se4', event_type: 'FRAUD_FLAG', reference_id: 'm4', reference_type: 'meter', payload: { reason: 'Multiple phones rapid advance', severity: 'HIGH' }, created_at: '2026-06-01T18:00:00Z' },
  { id: 'se5', event_type: 'VENDOR_FAILURE', reference_id: 'rt5', reference_type: 'recovery', payload: { vendor: 'VENDOR', error: 'timeout' }, created_at: '2026-05-10T08:30:00Z' },
  { id: 'se6', event_type: 'ADVANCE_ISSUED', reference_id: 'a1', reference_type: 'advance', payload: { amount: 10000, meter: '123456789' }, created_at: '2026-06-07T10:00:00Z' },
];

export const mockDashboardMetrics: DashboardMetrics = {
  total_advances_issued: 6,
  total_outstanding_cents: 57200,
  total_recovered_today_cents: 18500,
  recovery_rate: 96.4,
  active_meters: 4,
  active_borrowers: 5,
  default_rate: 1.6,
  fraud_alerts: 1,
};

// Chart data — advance volume over 30 days
export const advanceVolumeData = [
  { date: 'May 10', amount: 8000, recovered: 7500 },
  { date: 'May 13', amount: 15000, recovered: 14200 },
  { date: 'May 16', amount: 12000, recovered: 11800 },
  { date: 'May 19', amount: 22000, recovered: 21000 },
  { date: 'May 22', amount: 18000, recovered: 17500 },
  { date: 'May 25', amount: 9000, recovered: 9000 },
  { date: 'May 28', amount: 25000, recovered: 24100 },
  { date: 'May 31', amount: 31000, recovered: 29800 },
  { date: 'Jun 02', amount: 19500, recovered: 18900 },
  { date: 'Jun 05', amount: 28000, recovered: 27200 },
  { date: 'Jun 07', amount: 35000, recovered: 33500 },
  { date: 'Jun 09', amount: 57200, recovered: 18500 },
];

export const riskDistributionData = [
  { name: 'Premium', value: 2, color: '#22c55e' },
  { name: 'Standard', value: 2, color: '#f59e0b' },
  { name: 'Basic', value: 1, color: '#f97316' },
  { name: 'Declined', value: 1, color: '#ef4444' },
];

export const channelRecoveryData = [
  { channel: 'Capitec', success: 98, volume: 42000 },
  { channel: 'FNB', success: 97, volume: 35000 },
  { channel: 'Shoprite', success: 95, volume: 28000 },
  { channel: 'Boxer', success: 96, volume: 22000 },
  { channel: 'API', success: 99, volume: 18000 },
  { channel: 'Vendor', success: 87, volume: 9000 },
];
