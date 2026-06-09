import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/meters?number=XXX — Meter obligation lookup
export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get('number');

  if (!number) {
    return NextResponse.json({ error: 'Meter number required' }, { status: 400 });
  }

  try {
    const meter = await db.getMeterByNumber(number);

    if (!meter) {
      return NextResponse.json({
        meter_number: number,
        status: 'NOT_FOUND',
        outstanding_cents: 0,
        active_advances: 0,
        message: 'Meter not found in VoltAdvance registry.',
      });
    }

    const activeAdvances = await db.getActiveAdvancesForMeter(meter.id);

    return NextResponse.json({
      meter_number: meter.meter_number,
      provider: meter.provider_name,
      status: meter.status,
      outstanding_cents: meter.total_outstanding_cents,
      outstanding_rands: meter.total_outstanding_cents / 100,
      active_advances: activeAdvances.length,
      last_activity: meter.last_activity_at,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to lookup meter' }, { status: 500 });
  }
}

// POST /api/meters — Register a new meter
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meter_number, provider_name } = body;

    if (!meter_number) {
      return NextResponse.json({ error: 'meter_number is required' }, { status: 400 });
    }

    const newMeter = await db.createMeter({
      meter_number,
      provider_name: provider_name || 'City Power',
      status: 'ACTIVE',
    });

    return NextResponse.json({
      success: true,
      meter: {
        id: newMeter.id,
        meter_number: newMeter.meter_number,
        provider_name: newMeter.provider_name,
        status: newMeter.status,
        total_outstanding_cents: newMeter.total_outstanding_cents,
        created_at: newMeter.created_at,
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body or operation failed' }, { status: 400 });
  }
}
