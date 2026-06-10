import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/settlement
// Triggers the transactional clearing engine for any standard purchase
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

    // Trigger atomic clearing engine (Postgres function or simulated in-memory)
    const result = await db.executePurchaseClearing(
      meter_number,
      purchase_amount_cents,
      channel,
      external_transaction_id || `TXN-${Date.now()}`,
      is_borrower_purchasing
    );

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Clearing transaction failed' },
        { status: 500 }
      );
    }

    // Format display messaging
    const recovered_rands = result.debt_recovered_cents / 100;
    const electricity_rands = result.electricity_amount_cents / 100;
    const remaining_rands = result.remaining_outstanding_cents / 100;

    let message = '';
    if (result.scenario === 'NO_DEBT') {
      message = `Purchase cleared successfully. Issued full electricity value of R${electricity_rands.toFixed(2)}.`;
    } else if (result.scenario === 'FULL_RECOVERY') {
      message = `All outstanding debt settled (R${recovered_rands.toFixed(2)} recovered). Issued electricity value of R${electricity_rands.toFixed(2)}.`;
    } else {
      message = `Partial debt recovery applied (R${recovered_rands.toFixed(2)} recovered). Remaining debt: R${remaining_rands.toFixed(2)}. Issued electricity value of R${electricity_rands.toFixed(2)}.`;
    }

    return NextResponse.json({
      success: true,
      meter_number,
      scenario: result.scenario,
      purchase_amount_cents: result.purchase_amount_cents,
      debt_recovered_cents: result.debt_recovered_cents,
      electricity_amount_cents: result.electricity_amount_cents,
      remaining_outstanding_cents: result.remaining_outstanding_cents,
      message,
    });
  } catch (e) {
    console.error('Settlement routing error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
