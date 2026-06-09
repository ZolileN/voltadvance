import { NextRequest, NextResponse } from 'next/server';
import { evaluateRisk } from '@/lib/risk-engine';
import { supabase } from '@/lib/supabase';

// Persist session state across hot reloads in development
const globalSessionMap = (global as any)._whatsappSessions || new Map<string, { state: string; meterNumber?: string }>();
if (process.env.NODE_ENV !== 'production') {
  (global as any)._whatsappSessions = globalSessionMap;
}

const MENU = `⚡ *VoltAdvance Bot*
_Utility Credit Infrastructure_

Please choose:
1️⃣ Request Advance
2️⃣ My Balance
3️⃣ Meter Status
4️⃣ Repayment History

Type a number or keyword.`;

export async function POST(req: NextRequest) {
  try {
    // Twilio sends urlencoded post requests
    const contentType = req.headers.get('content-type') || '';
    let from = '';
    let body = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      from = params.get('From') || '';
      body = params.get('Body') || '';
    } else {
      // JSON fallback
      const json = await req.json();
      from = json.From || '';
      body = json.Body || '';
    }

    // Clean phone number (e.g. "whatsapp:+27821234567" -> "+27821234567")
    const phone = from.replace('whatsapp:', '').trim();
    if (!phone) {
      return new NextResponse('<Response><Message>Error: Missing sender phone number.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const normalized = body.toLowerCase().trim();

    // Get session
    let session = globalSessionMap.get(phone);
    if (!session) {
      session = { state: 'IDLE', meterNumber: '123456789' };
      globalSessionMap.set(phone, session);
    }

    let replyText = '';

    if (session.state === 'IDLE') {
      if (['1', 'request advance', 'advance', 'request electricity advance'].includes(normalized)) {
        replyText = `📋 *Advance Request*

Your meter: ${session.meterNumber || '123456789'}
Trust Score: 85/100 ✅

How much would you like?

1️⃣ R50
2️⃣ R100
3️⃣ R200
4️⃣ R300 (max)

Type the number or amount:`;
        session.state = 'AWAITING_ADVANCE_AMOUNT';
      } else if (['2', 'my balance', 'balance'].includes(normalized)) {
        replyText = `💳 *Your Account*

Phone: ${phone}
Trust Score: *85/100* (Premium)
Active Exposure: *R110.00*
Total Repaid: *R850.00*
Advance Limit: *R300*

Outstanding advance: ADV-0001-01
Amount due: *R110.00*
_Will recover on next electricity purchase._`;
      } else if (['3', 'meter status', 'check meter'].some(k => normalized.includes(k))) {
        if (normalized.includes('check meter ') || /\d{9}/.test(normalized)) {
          const meterNum = normalized.match(/\d{9}/)?.[0] || '123456789';
          replyText = getMeterStatusString(meterNum);
        } else {
          replyText = '🔌 *Meter Lookup*\n\nPlease enter your meter number:';
          session.state = 'AWAITING_METER';
        }
      } else if (['4', 'repayment history', 'history'].includes(normalized)) {
        replyText = `📊 *Repayment History*

ADV-0003-01 · R100 → ✅ Settled (Jun 02)
ADV-0002-01 · R50  → ✅ Settled (May 15)
ADV-0001-01 · R100 → 🟡 Active (Jun 07)

Recovery Rate: *100%*
Next advance available after settlement.`;
      } else {
        replyText = `Welcome to VoltAdvance! 👋\n\n${MENU}`;
      }
    } else if (session.state === 'AWAITING_ADVANCE_AMOUNT') {
      const amountMap: Record<string, number> = { '1': 50, '2': 100, '3': 200, '4': 300 };
      let amount = amountMap[normalized];
      if (!amount) {
        const parsed = parseFloat(normalized.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
          amount = parsed;
        }
      }

      if (amount) {
        const fee = Math.round(amount * 0.1);
        const total = amount + fee;
        const tokens = Array.from({ length: 4 }, () =>
          Math.floor(1000 + Math.random() * 9000)
        ).join('-');

        replyText = `✅ *Advance Approved!*

*Amount:* R${amount.toFixed(2)}
*Fee:* R${fee.toFixed(2)} _(recovered automatically)_
*Total owed:* R${total.toFixed(2)}

Your electricity token:
\`${tokens}\`

🔌 Token valid for meter: ${session.meterNumber || '123456789'}
💡 Repayment: automatic on next purchase

Stay powered. 💛`;
        session.state = 'IDLE';
      } else {
        replyText = 'Please choose 1–4 or type an amount between R20 and R300.';
      }
    } else if (session.state === 'AWAITING_METER') {
      const meterNum = normalized.match(/\d{6,12}/)?.[0] || normalized;
      replyText = getMeterStatusString(meterNum);
      session.state = 'IDLE';
    }

    // Save updated session
    globalSessionMap.set(phone, session);

    // Build TwiML response
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`;

    return new NextResponse(xml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (e: any) {
    console.error('WhatsApp Bot webhook error:', e);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>An unexpected error occurred. Please try again later.</Message>
</Response>`;
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 500
    });
  }
}

function getMeterStatusString(meterNum: string): string {
  const data: Record<string, string> = {
    '123456789': `🔌 *Meter Status: 123456789*

Provider: City Power
Status: ✅ Active
Outstanding: R110.00
Borrower: ****4567
Last activity: 1 day ago
Risk level: Low`,
    '777300400': `🔌 *Meter Status: 777300400*

Provider: Eskom
Status: ⚠️ FLAGGED
Outstanding: R100.00
Borrower: ****1111
Last activity: 8 days ago
Risk level: 🔴 HIGH

Multiple phone numbers detected.`,
  };

  return data[meterNum] || `🔌 *Meter: ${meterNum}*

Status: Not found in registry.
Please check the meter number and try again.`;
}
