import { RecoveryResult, AdvanceStatus } from './types';

export interface RecoveryInput {
  purchase_amount_cents: number;
  outstanding_cents: number;
  has_linked_borrower: boolean;
  is_borrower_purchasing: boolean;
  consent_granted: boolean;
}

export function calculateRecovery(input: RecoveryInput): RecoveryResult {
  const { purchase_amount_cents, outstanding_cents, has_linked_borrower, is_borrower_purchasing, consent_granted } = input;

  // Scenario C: No outstanding debt
  if (outstanding_cents === 0 || !has_linked_borrower) {
    return {
      purchase_amount_cents,
      debt_recovered_cents: 0,
      electricity_amount_cents: purchase_amount_cents,
      advance_status: 'SETTLED',
      scenario: 'NO_DEBT',
    };
  }

  // Scenario A & B: Borrower or Third-Party purchases electricity directly under consent agreement
  // The Recovery Split Rule caps debt recovery at a maximum of 50% of the gross incoming purchase value
  if (consent_granted) {
    const recoveryCap = Math.floor(purchase_amount_cents * 0.5);
    const recovered = Math.min(outstanding_cents, recoveryCap);
    const electricity = purchase_amount_cents - recovered;
    const newOutstanding = outstanding_cents - recovered;
    const status: AdvanceStatus = newOutstanding <= 0 ? 'SETTLED' : 'PARTIALLY_REPAID';

    return {
      purchase_amount_cents,
      debt_recovered_cents: recovered,
      electricity_amount_cents: electricity,
      advance_status: status,
      scenario: is_borrower_purchasing ? 'BORROWER' : 'THIRD_PARTY',
    };
  }

  // No consent — allow purchase but recovery is 0
  return {
    purchase_amount_cents,
    debt_recovered_cents: 0,
    electricity_amount_cents: purchase_amount_cents,
    advance_status: 'ACTIVE',
    scenario: 'NO_DEBT',
  };
}

export function formatCents(cents: number): string {
  return `R ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function centsToRands(cents: number): number {
  return cents / 100;
}

export function randsToCents(rands: number): number {
  return Math.round(rands * 100);
}
