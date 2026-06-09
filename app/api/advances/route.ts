import { NextRequest, NextResponse } from 'next/server';
import { evaluateRisk } from '@/lib/risk-engine';
import { db } from '@/lib/db';

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

    // Step 1: Look up or create borrower
    let borrower = await db.getBorrowerByPhone(phone_number);
    if (!borrower) {
      borrower = await db.createBorrower({
        phone_number,
        trust_score: 75,
        risk_tier: 'STANDARD',
        total_active_exposure_cents: 0,
        total_repaid_cents: 0,
      });
    }

    // Step 2: Look up or create meter
    let meter = await db.getMeterByNumber(meter_number);
    if (!meter) {
      meter = await db.createMeter({
        meter_number,
        provider_name: 'City Power',
        status: 'ACTIVE',
      });
    }

    // Step 3: Risk evaluation
    const risk = evaluateRisk({
      phone_number,
      meter_age_days: 200,
      purchase_frequency_per_month: 4,
      average_purchase_cents: 15000,
      advances_taken: borrower.total_repaid_cents > 0 ? 3 : 0,
      advances_repaid: borrower.total_repaid_cents > 0 ? 3 : 0,
      time_to_repayment_days: 5,
      current_outstanding_cents: meter.total_outstanding_cents,
      linked_phone_count: 1,
      suspicious_patterns: meter.status === 'FLAGGED',
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

    // Step 4: Generate advance reference
    const advance_reference = `ADV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;

    // Step 5: Generate electricity token
    const token = Array.from({ length: 4 }, () =>
      Math.floor(1000 + Math.random() * 9000)
    ).join('-');

    // Step 6: Persist advance to database
    const total_owed_cents = amount_cents + fee_cents;
    const advance = await db.createAdvance({
      advance_reference,
      borrower_id: borrower.id,
      meter_id: meter.id,
      principal_cents: amount_cents,
      fee_cents,
      outstanding_cents: total_owed_cents,
      repaid_cents: 0,
      status: 'ACTIVE',
      issued_via,
      consent_snapshot: true
    });

    // Step 7: Update meter balance
    await db.updateMeterBalance(meter.id, total_owed_cents);

    // Step 8: Log system event
    await db.createSystemEvent({
      event_type: 'ADVANCE_ISSUED',
      reference_id: advance.id,
      reference_type: 'advance',
      payload: { amount: amount_cents, meter: meter_number }
    });

    return NextResponse.json({
      approved: true,
      advance: {
        id: advance.id,
        advance_reference,
        phone_number,
        meter_number,
        principal_rands: amount_rands,
        fee_rands: fee_cents / 100,
        total_owed_rands: total_owed_cents / 100,
        status: 'ACTIVE',
        issued_via,
        token,
        created_at: advance.created_at,
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

// GET /api/advances
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  const meter = req.nextUrl.searchParams.get('meter');

  try {
    const list = await db.getAdvances();
    let filtered = list;

    // Filter logic if needed
    if (phone) {
      const b = await db.getBorrowerByPhone(phone);
      filtered = b ? filtered.filter(a => a.borrower_id === b.id) : [];
    }
    if (meter) {
      const m = await db.getMeterByNumber(meter);
      filtered = m ? filtered.filter(a => a.meter_id === m.id) : [];
    }

    return NextResponse.json({
      advances: filtered,
      total: filtered.length,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch advances' }, { status: 500 });
  }
}
