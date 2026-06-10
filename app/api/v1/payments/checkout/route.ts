import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meterNumber, amountCents, transactionId, status = 'SUCCESSFUL' } = body;

    if (!meterNumber || !amountCents || !transactionId) {
      return NextResponse.json(
        { error: 'Missing required fields (meterNumber, amountCents, transactionId)' },
        { status: 400 }
      );
    }

    if (status !== 'SUCCESSFUL' && status !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Payment was not marked as successful' },
        { status: 400 }
      );
    }

    // Process the purchase clearing (Enforce 50% Recovery Split Cap)
    const clearing = await db.executePurchaseClearing(
      meterNumber,
      amountCents,
      'CARD', // Digital card payment channel
      transactionId,
      true // Is borrower purchasing
    );

    // Generate a mock municipal electricity vending token
    const token = Array.from({ length: 4 }, () =>
      Math.floor(1000 + Math.random() * 9000)
    ).join('-');

    return NextResponse.json({
      success: true,
      message: 'Checkout callback processed. Vending token generated.',
      meterNumber,
      transactionId,
      clearing: {
        gross_amount_cents: amountCents,
        debt_recovered_cents: clearing.debt_recovered_cents,
        electricity_amount_cents: clearing.electricity_amount_cents,
        remaining_outstanding_cents: clearing.remaining_outstanding_cents,
        scenario: clearing.scenario
      },
      token
    });
  } catch (e) {
    console.error('Checkout callback processing failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
