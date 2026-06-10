import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, dbClient } from '@/lib/db';

export async function POST(req: NextRequest) {
  let requestBody = '';
  try {
    requestBody = await req.text();
    const headers = req.headers;
    const signature = headers.get('x-volt-signature') || headers.get('x-signature') || '';
    const partnerName = headers.get('x-partner-name') || '';

    if (!partnerName) {
      return NextResponse.json({ error: 'Missing x-partner-name header' }, { status: 400 });
    }

    // 1. Resolve partner secret
    let partnerSecret = 'netvendor_secret_key_12345'; // default fallback key
    if (dbClient) {
      try {
        const { data } = await dbClient
          .from('intercept_partner_configurations')
          .select('hmac_secret')
          .eq('partner_name', partnerName)
          .eq('active', true)
          .maybeSingle();
        if (data?.hmac_secret) {
          partnerSecret = data.hmac_secret;
        }
      } catch (dbErr) {
        console.warn('Failed to query partner configuration from DB, using fallback secret:', dbErr);
      }
    } else {
      if (partnerName === 'NETVENDOR') partnerSecret = 'netvendor_secret_key_12345';
      if (partnerName === 'METRO_PREPAID') partnerSecret = 'metro_secret_key_12345';
    }

    // 2. Verify HMAC-SHA256 Signature
    const computedSignature = crypto
      .createHmac('sha256', partnerSecret)
      .update(requestBody)
      .digest('hex');

    if (computedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const payload = JSON.parse(requestBody);
    const { meterNumber, purchaseAmountCents, channel, transactionId } = payload;

    if (!meterNumber || !purchaseAmountCents || !channel || !transactionId) {
      return NextResponse.json({ error: 'Missing required payload fields (meterNumber, purchaseAmountCents, channel, transactionId)' }, { status: 400 });
    }

    // 3. Define Failsafe Timeout Promise (150ms limit)
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          action: 'PROCEED_NOMINAL',
          deduct_amount_cents: 0,
          forward_vending_amount_cents: purchaseAmountCents,
          status: 'TIMEOUT_FALLBACK'
        });
      }, 150);
    });

    // 4. Define Evaluation & Clearing Promise
    const evaluationPromise = (async () => {
      const result = await db.executePurchaseClearing(
        meterNumber,
        purchaseAmountCents,
        channel,
        transactionId
      );

      if (result && result.success) {
        const action = result.debt_recovered_cents > 0 ? 'APPLY_RECOVERY_SPLIT' : 'PROCEED_NOMINAL';
        return {
          action,
          deduct_amount_cents: result.debt_recovered_cents,
          forward_vending_amount_cents: result.electricity_amount_cents,
          remaining_outstanding_cents: result.remaining_outstanding_cents,
          status: 'SUCCESS'
        };
      } else {
        return {
          action: 'PROCEED_NOMINAL',
          deduct_amount_cents: 0,
          forward_vending_amount_cents: purchaseAmountCents,
          status: 'FAILED_FALLBACK',
          error: result?.error || 'Unknown evaluation failure'
        };
      }
    })();

    // 5. Race execution
    const responsePayload = await Promise.race([evaluationPromise, timeoutPromise]);
    return NextResponse.json(responsePayload);
  } catch (e) {
    console.error('Evaluation API error:', e);
    return NextResponse.json({
      action: 'PROCEED_NOMINAL',
      deduct_amount_cents: 0,
      forward_vending_amount_cents: 10000, // Safe nominal fallback
      status: 'ERROR_FALLBACK',
      error: String(e)
    }, { status: 200 }); // Return status 200 with fallback so partner transaction goes through
  }
}
