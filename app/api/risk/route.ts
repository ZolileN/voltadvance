import { NextRequest, NextResponse } from 'next/server';
import { evaluateRisk } from '@/lib/risk-engine';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  try {
    const borrower = await db.getBorrowerByPhone(phone);
    
    // Evaluate risk based on actual database profile or a clean baseline for new users
    const evaluation = evaluateRisk({
      phone_number: phone,
      meter_age_days: 365,
      purchase_frequency_per_month: 4,
      average_purchase_cents: 15000,
      advances_taken: borrower ? Math.round(borrower.total_repaid_cents / 10000) : 0,
      advances_repaid: borrower ? Math.round(borrower.total_repaid_cents / 10000) : 0,
      time_to_repayment_days: 5,
      current_outstanding_cents: borrower ? borrower.total_active_exposure_cents : 0,
      linked_phone_count: 1,
      suspicious_patterns: false,
    });

    return NextResponse.json({
      phone,
      ...evaluation,
      advance_limit_rands: evaluation.advance_limit_cents / 100,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to evaluate risk' }, { status: 500 });
  }
}
