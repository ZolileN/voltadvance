import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize the request if CRON_SECRET is configured
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // We allow standard query parameter checks as well for testing ease
    const searchParams = req.nextUrl.searchParams;
    const urlSecret = searchParams.get('secret');
    
    if (cronSecret) {
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;
      const isParamValid = urlSecret === cronSecret;
      
      if (!isBearerValid && !isParamValid) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing secret token' },
          { status: 401 }
        );
      }
    }

    // 2. Ensure dbClient is initialized
    if (!dbClient) {
      return NextResponse.json(
        { error: 'Database client not initialized. Check environment variables.' },
        { status: 500 }
      );
    }

    // 3. Ping the database with a lightweight select query
    const startTime = Date.now();
    console.log('[keep-alive] Sending database select query...');
    
    const { error } = await dbClient
      .from('physical_meters')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[keep-alive] Database query error:', error);
      throw error;
    }

    const durationMs = Date.now() - startTime;
    console.log(`[keep-alive] Database query succeeded in ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      message: 'Keep-alive database ping successful.',
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Keep-awake cron error:', err);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
