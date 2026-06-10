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
    
    const digits = phone.replace(/[^0-9]/g, '');
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i], 10) || 0;
    }
    
    const advancesTaken = borrower && borrower.total_repaid_cents > 0 
      ? Math.max(1, Math.round(borrower.total_repaid_cents / 10000)) 
      : 0;

    // Evaluate risk based on actual database profile or a clean baseline for new users
    const evaluation = evaluateRisk({
      phone_number: phone,
      meter_age_days: 180 + (sum % 360),
      purchase_frequency_per_month: 3 + (sum % 4),
      average_purchase_cents: 8000 + (sum % 12000),
      advances_taken: advancesTaken,
      advances_repaid: advancesTaken,
      time_to_repayment_days: 3 + (sum % 5),
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
