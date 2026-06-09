import { NextRequest, NextResponse } from 'next/server';
import { evaluateRisk } from '@/lib/risk-engine';

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  // In production, fetch real meter history from Supabase
  // For now, return a simulated risk evaluation
  const evaluation = evaluateRisk({
    phone_number: phone,
    meter_age_days: 365,
    purchase_frequency_per_month: 4,
    average_purchase_cents: 15000,
    advances_taken: 3,
    advances_repaid: 3,
    time_to_repayment_days: 5,
    current_outstanding_cents: 0,
    linked_phone_count: 1,
    suspicious_patterns: false,
  });

  return NextResponse.json({
    phone,
    ...evaluation,
    advance_limit_rands: evaluation.advance_limit_cents / 100,
  });
}
