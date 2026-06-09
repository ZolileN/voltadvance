import { NextRequest, NextResponse } from 'next/server';
import { evaluateRisk } from '@/lib/risk-engine';

// POST /api/advances — Issue a new advance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number, meter_number, amount_rands, issued_via = 'WHATSAPP' } = body;

    if (!phone_number || !meter_number || !amount_rands) {
      return NextResponse.json(
        { error: 'phone_number, meter_number, and amount_rands are required' },
        { status: 400 }
      );
    }

    const amount_cents = Math.round(amount_rands * 100);
    const fee_cents = Math.round(amount_cents * 0.1); // 10% fee

    // Step 1: Risk evaluation
    const risk = evaluateRisk({
      phone_number,
      meter_age_days: 200,
      purchase_frequency_per_month: 4,
      average_purchase_cents: 15000,
      advances_taken: 2,
      advances_repaid: 2,
      time_to_repayment_days: 5,
      current_outstanding_cents: 0,
      linked_phone_count: 1,
      suspicious_patterns: false,
    });

    if (!risk.approved) {
      return NextResponse.json({
        approved: false,
        reason: risk.reason,
        trust_score: risk.trust_score,
        risk_tier: risk.risk_tier,
      }, { status: 403 });
    }

    if (amount_cents > risk.advance_limit_cents) {
      return NextResponse.json({
        approved: false,
        reason: `Requested amount exceeds advance limit of R${(risk.advance_limit_cents / 100).toFixed(2)} for your trust score.`,
        trust_score: risk.trust_score,
        advance_limit_rands: risk.advance_limit_cents / 100,
      }, { status: 403 });
    }

    // Step 2: Generate advance reference
    const advance_reference = `ADV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;

    // Step 3: Generate mock electricity token
    const token = Array.from({ length: 4 }, () =>
      Math.floor(1000 + Math.random() * 9000)
    ).join('-');

    // In production:
    // 1. Create advance record in Supabase
    // 2. Link to borrower and meter
    // 3. Call vending API to generate real electricity token
    // 4. Log system event

    return NextResponse.json({
      approved: true,
      advance: {
        advance_reference,
        phone_number,
        meter_number,
        principal_rands: amount_rands,
        fee_rands: fee_cents / 100,
        total_owed_rands: (amount_cents + fee_cents) / 100,
        status: 'ACTIVE',
        issued_via,
        token,
        created_at: new Date().toISOString(),
      },
      risk: {
        trust_score: risk.trust_score,
        risk_tier: risk.risk_tier,
      },
    }, { status: 201 });
  } catch (e) {
    console.error('Advance issuance error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/advances?phone=XXX
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  const meter = req.nextUrl.searchParams.get('meter');

  // In production: query Supabase advances table
  return NextResponse.json({
    advances: [],
    filters: { phone, meter },
    total: 0,
  });
}
