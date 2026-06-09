import { NextRequest, NextResponse } from 'next/server';

// GET /api/meters?number=XXX — Meter obligation lookup
export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get('number');

  if (!number) {
    return NextResponse.json({ error: 'Meter number required' }, { status: 400 });
  }

  // In production: query Supabase meters + advances tables
  const mockData: Record<string, object> = {
    '123456789': {
      meter_number: '123456789',
      provider: 'City Power',
      status: 'ACTIVE',
      outstanding_cents: 11000,
      outstanding_rands: 110.00,
      borrower: '****4567',
      active_advances: 1,
      risk_status: 'normal',
      last_activity: new Date(Date.now() - 86400000).toISOString(),
    },
    '777300400': {
      meter_number: '777300400',
      provider: 'Eskom',
      status: 'FLAGGED',
      outstanding_cents: 10000,
      outstanding_rands: 100.00,
      borrower: '****1111',
      active_advances: 1,
      risk_status: 'high',
      last_activity: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
  };

  const meter = mockData[number];
  if (!meter) {
    return NextResponse.json({
      meter_number: number,
      status: 'NOT_FOUND',
      outstanding_cents: 0,
      active_advances: 0,
      message: 'Meter not found in VoltAdvance registry.',
    });
  }

  return NextResponse.json(meter);
}

// POST /api/meters — Register a new meter
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meter_number, provider_name, external_reference } = body;

    if (!meter_number) {
      return NextResponse.json({ error: 'meter_number is required' }, { status: 400 });
    }

    // In production: insert into Supabase meters table
    return NextResponse.json({
      success: true,
      meter: {
        id: `mock-${Date.now()}`,
        meter_number,
        provider_name: provider_name || 'Unknown',
        external_reference,
        status: 'ACTIVE',
        total_outstanding_cents: 0,
        created_at: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
