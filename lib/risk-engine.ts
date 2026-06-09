import { RiskEvaluation, RiskTier } from './types';

interface RiskInputs {
  phone_number: string;
  meter_age_days: number;
  purchase_frequency_per_month: number;
  average_purchase_cents: number;
  advances_taken: number;
  advances_repaid: number;
  time_to_repayment_days: number;
  current_outstanding_cents: number;
  linked_phone_count: number;
  suspicious_patterns: boolean;
}

function calculateTrustScore(inputs: RiskInputs): number {
  let score = 50; // baseline

  // Meter history (max +20)
  const meterAgeFactor = Math.min(inputs.meter_age_days / 365, 2) * 5;
  score += meterAgeFactor;

  const frequencyFactor = Math.min(inputs.purchase_frequency_per_month / 4, 1) * 10;
  score += frequencyFactor;

  const spendFactor = Math.min(inputs.average_purchase_cents / 20000, 1) * 5;
  score += spendFactor;

  // Repayment history (max +25)
  if (inputs.advances_taken > 0) {
    const repaymentRate = inputs.advances_repaid / inputs.advances_taken;
    score += repaymentRate * 25;

    // Time-to-repayment bonus (fast repayers get rewarded)
    if (inputs.time_to_repayment_days < 7) score += 5;
    else if (inputs.time_to_repayment_days < 14) score += 2;
    else if (inputs.time_to_repayment_days > 30) score -= 5;
  }

  // Risk penalties
  if (inputs.current_outstanding_cents > 0) score -= 10; // existing debt
  if (inputs.linked_phone_count > 3) score -= 15; // multi-phone abuse risk
  if (inputs.suspicious_patterns) score -= 20; // fraud signals

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTierFromScore(score: number): RiskTier {
  if (score <= 40) return 'DECLINED';
  if (score <= 60) return 'BASIC';
  if (score <= 80) return 'STANDARD';
  return 'PREMIUM';
}

function getAdvanceLimitFromScore(score: number): number {
  if (score <= 40) return 0;
  if (score <= 60) return 2000;   // R20
  if (score <= 80) return 10000;  // R100
  return 30000;                   // R300
}

export function evaluateRisk(inputs: RiskInputs): RiskEvaluation {
  const trust_score = calculateTrustScore(inputs);
  const risk_tier = getTierFromScore(trust_score);
  const advance_limit_cents = getAdvanceLimitFromScore(trust_score);
  const approved = trust_score > 40;

  let reason: string | undefined;
  if (!approved) {
    if (inputs.suspicious_patterns) reason = 'Suspicious activity detected on this meter.';
    else if (inputs.advances_taken > 0 && inputs.advances_repaid < inputs.advances_taken) reason = 'Outstanding unpaid advances exist.';
    else reason = 'Insufficient meter history for advance approval.';
  }

  return { trust_score, risk_tier, advance_limit_cents, approved, reason };
}

export function scoreTierLabel(score: number): string {
  if (score >= 81) return 'Premium';
  if (score >= 61) return 'Standard';
  if (score >= 41) return 'Basic';
  return 'Declined';
}

export function scoreTierColor(score: number): string {
  if (score >= 81) return 'var(--color-success)';
  if (score >= 61) return 'var(--color-amber)';
  if (score >= 41) return 'var(--color-warning)';
  return 'var(--color-danger)';
}
