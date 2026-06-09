import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const list = await db.getBorrowers();
    return NextResponse.json({
      borrowers: list,
      total: list.length,
    });
  } catch (e) {
    console.error('Failed to fetch borrowers:', e);
    return NextResponse.json({ error: 'Failed to fetch borrowers' }, { status: 500 });
  }
}
