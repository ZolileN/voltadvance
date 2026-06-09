import { NextRequest, NextResponse } from 'next/server';
import { calculateRecovery } from '@/lib/recovery-engine';
import { db } from '@/lib/db';

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

    // Step 1: Look up meter
    let meter = await db.getMeterByNumber(meter_number);
    if (!meter) {
      // Auto-create meter if not exists to facilitate testing
      meter = await db.createMeter({
        meter_number,
        provider_name: 'City Power',
        status: 'ACTIVE',
      });
    }

    // Step 2: Fetch active/partially repaid advances for this meter
    const activeAdvances = await db.getActiveAdvancesForMeter(meter.id);
    const outstanding_cents = activeAdvances.reduce((sum, a) => sum + a.outstanding_cents, 0);
    const hasLinkedBorrower = activeAdvances.length > 0;

    // Step 3: Run recovery engine math
    const result = calculateRecovery({
      purchase_amount_cents,
      outstanding_cents,
      has_linked_borrower: hasLinkedBorrower,
      is_borrower_purchasing,
      consent_granted: true,
    });

    let remainingRecovery = result.debt_recovered_cents;

    // Step 4: Apply repayment deductions sequentially to active advances
    for (const advance of activeAdvances) {
      if (remainingRecovery <= 0) break;

      const deduction = Math.min(advance.outstanding_cents, remainingRecovery);
      remainingRecovery -= deduction;

      const newOutstanding = advance.outstanding_cents - deduction;
      const newStatus = newOutstanding <= 0 ? 'SETTLED' : 'PARTIALLY_REPAID';

      // Update advance in database
      await db.updateAdvanceRepayment(advance.id, deduction, newStatus);

      // Create recovery transaction record
      const recoveryTx = await db.createRecoveryTransaction({
        advance_id: advance.id,
        meter_id: meter.id,
        amount_cents: deduction,
        channel,
        event_type: newStatus === 'SETTLED' ? 'FULL' : 'PARTIAL',
        external_transaction_id,
      });

      // Log system event for this recovery
      await db.createSystemEvent({
        event_type: 'RECOVERY_APPLIED',
        reference_id: recoveryTx.id,
        reference_type: 'recovery',
        payload: { amount: deduction, channel, advance_ref: advance.advance_reference }
      });
    }

    // Step 5: Update the meter's outstanding balance
    if (result.debt_recovered_cents > 0) {
      await db.updateMeterBalance(meter.id, -result.debt_recovered_cents);
    }

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
  const meterNum = req.nextUrl.searchParams.get('meter');
  if (!meterNum) {
    return NextResponse.json({ error: 'meter parameter required' }, { status: 400 });
  }

  try {
    const meter = await db.getMeterByNumber(meterNum);
    if (!meter) {
      return NextResponse.json({
        meter_number: meterNum,
        total_recovered_cents: 0,
        recovery_count: 0,
        outstanding_cents: 0,
      });
    }

    const txs = await db.getRecoveryTransactions();
    const meterTxs = txs.filter(t => t.meter_id === meter.id);
    const totalRecovered = meterTxs.reduce((sum, t) => sum + t.amount_cents, 0);

    return NextResponse.json({
      meter_number: meterNum,
      total_recovered_cents: totalRecovered,
      recovery_count: meterTxs.length,
      last_recovery: meterTxs[0]?.created_at || null,
      outstanding_cents: meter.total_outstanding_cents,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch recovery details' }, { status: 500 });
  }
}
