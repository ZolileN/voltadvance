import { NextRequest, NextResponse } from 'next/server';
import { calculateRecovery } from '@/lib/recovery-engine';

// POST /api/recovery
// Called by vending integration layer when electricity purchase occurs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      meter_number,
      purchase_amount_cents,
      channel,
      external_transaction_id,
      is_borrower_purchasing = true,
    } = body;

    if (!meter_number || !purchase_amount_cents || !channel) {
      return NextResponse.json(
        { error: 'meter_number, purchase_amount_cents, and channel are required' },
        { status: 400 }
      );
    }

    // In production: query Supabase for active advances on this meter
    // For now: simulate with mock outstanding
    const mockOutstanding = 11000; // R110 in cents
    const hasLinkedBorrower = true;

    const result = calculateRecovery({
      purchase_amount_cents,
      outstanding_cents: mockOutstanding,
      has_linked_borrower: hasLinkedBorrower,
      is_borrower_purchasing,
      consent_granted: true,
    });

    // In production:
    // 1. Update advance.outstanding_cents in Supabase
    // 2. Insert recovery_transaction record
    // 3. Insert system_event record
    // 4. Return electricity token value to vending system

    return NextResponse.json({
      success: true,
      meter_number,
      channel,
      external_transaction_id,
      recovery: {
        purchase_amount_rands: purchase_amount_cents / 100,
        debt_recovered_rands: result.debt_recovered_cents / 100,
        electricity_value_rands: result.electricity_amount_cents / 100,
        scenario: result.scenario,
        advance_status: result.advance_status,
      },
      message: result.debt_recovered_cents > 0
        ? `Debt of R${(result.debt_recovered_cents / 100).toFixed(2)} recovered. Electricity token issued for R${(result.electricity_amount_cents / 100).toFixed(2)}.`
        : 'No outstanding debt. Full electricity value issued.',
    });
  } catch (e) {
    console.error('Recovery engine error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/recovery?meter=XXX
export async function GET(req: NextRequest) {
  const meter = req.nextUrl.searchParams.get('meter');
  if (!meter) {
    return NextResponse.json({ error: 'meter parameter required' }, { status: 400 });
  }

  // In production: query recovery_transactions for this meter
  return NextResponse.json({
    meter_number: meter,
    total_recovered_cents: 22000,
    recovery_count: 3,
    last_recovery: new Date().toISOString(),
    outstanding_cents: 11000,
  });
}
