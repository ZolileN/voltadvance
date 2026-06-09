import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const events = await db.getSystemEvents();
    const purchases = await db.getMeterPurchases();
    const meters = await db.getMeters();

    const enrichedPurchases = purchases.map(p => {
      const m = meters.find(mObj => mObj.id === p.meter_id);
      return {
        ...p,
        meter_number: m?.meter_number || 'Unknown'
      };
    });

    return NextResponse.json({
      events,
      purchases: enrichedPurchases
    });
  } catch (e) {
    console.error('Failed to fetch events:', e);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
