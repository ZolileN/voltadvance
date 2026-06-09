import { NextRequest, NextResponse } from 'next/server';
import { evaluateRisk } from '@/lib/risk-engine';
import { db } from '@/lib/db';

// Persist session state across hot reloads in development
const globalSessionMap = (global as any)._whatsappSessions || new Map<string, { state: string; meterNumber?: string }>();
if (process.env.NODE_ENV !== 'production') {
  (global as any)._whatsappSessions = globalSessionMap;
}

const MENU = `⚡ *VoltAdvance Bot*
_Utility Credit Infrastructure_

Please choose an option:
1️⃣ Buy Electricity (Standard Recharge)
2️⃣ Request Advance (Emergency Credit)
3️⃣ My Account & Balances
4️⃣ Meter Status & History

Type a number or keyword.`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let from = '';
    let body = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      from = params.get('From') || '';
      body = params.get('Body') || '';
    } else {
      const json = await req.json();
      from = json.From || '';
      body = json.Body || '';
    }

    const phone = from.replace('whatsapp:', '').trim();
    if (!phone) {
      return new NextResponse('<Response><Message>Error: Missing sender phone number.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const normalized = body.toLowerCase().trim();

    let session = globalSessionMap.get(phone);
    if (!session) {
      session = { state: 'IDLE', meterNumber: '123456789' };
      globalSessionMap.set(phone, session);
    }

    let replyText = '';

    if (session.state === 'IDLE') {
      if (['1', 'buy', 'buy electricity', 'recharge'].includes(normalized)) {
        replyText = `🔌 *Buy Electricity*

Your meter: ${session.meterNumber || '123456789'}

How much electricity would you like to buy?
(Enter an amount in Rands, e.g. *100* or *200*):`;
        session.state = 'AWAITING_BUY_AMOUNT';
      } else if (['2', 'request advance', 'advance', 'emergency'].includes(normalized)) {
        replyText = `📋 *Advance Request*

Your meter: ${session.meterNumber || '123456789'}
Trust Score: 85/100 ✅

How much emergency credit would you like?

1️⃣ R50
2️⃣ R100
3️⃣ R200
4️⃣ R300 (max)

Type the number or amount:`;
        session.state = 'AWAITING_ADVANCE_AMOUNT';
      } else if (['3', 'my balance', 'balance', 'account'].includes(normalized)) {
        // Fetch real balance from database when possible
        let outstandingRands = 110.0;
        let limitRands = 300.0;
        let repaidRands = 850.0;

        const borrower = await db.getBorrowerByPhone(phone);
        if (borrower) {
          outstandingRands = borrower.total_active_exposure_cents / 100;
          repaidRands = borrower.total_repaid_cents / 100;
          const risk = evaluateRisk({
            phone_number: phone,
            meter_age_days: 200,
            purchase_frequency_per_month: 4,
            average_purchase_cents: 15000,
            advances_taken: borrower.total_repaid_cents > 0 ? 3 : 0,
            advances_repaid: borrower.total_repaid_cents > 0 ? 3 : 0,
            time_to_repayment_days: 5,
            current_outstanding_cents: borrower.total_active_exposure_cents,
            linked_phone_count: 1,
            suspicious_patterns: false,
          });
          limitRands = risk.advance_limit_cents / 100;
        }

        replyText = `💳 *Your Account & Balances*

Phone: ${phone}
Trust Score: *85/100* (Premium)
Active Exposure: *R${outstandingRands.toFixed(2)}*
Total Repaid: *R${repaidRands.toFixed(2)}*
Advance Limit: *R${limitRands.toFixed(0)}*

${outstandingRands > 0 ? `Outstanding advance balance: *R${outstandingRands.toFixed(2)}*\n_Repayment is auto-recovered from your next purchase._` : 'No outstanding advances! You are clear to take a new advance.'}`;
      } else if (['4', 'meter status', 'meter', 'history'].includes(normalized)) {
        if (normalized.includes('check ') || /\d{9}/.test(normalized)) {
          const meterNum = normalized.match(/\d{9}/)?.[0] || '123456789';
          replyText = await getMeterStatusString(meterNum);
        } else {
          replyText = '🔌 *Meter Status & History*\n\nEnter your 9-digit meter number to check obligations:\n_(e.g. 123456789)_';
          session.state = 'AWAITING_METER';
        }
      } else {
        replyText = `Welcome to VoltAdvance! 👋\n\n${MENU}`;
      }
    } else if (session.state === 'AWAITING_BUY_AMOUNT') {
      const parsedAmount = parseFloat(normalized.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        const purchase_cents = Math.round(parsedAmount * 100);
        
        // Execute dynamic clearing engine transaction
        const clearing = await db.executePurchaseClearing(
          session.meterNumber || '123456789',
          purchase_cents,
          'WHATSAPP',
          `WA-${Date.now()}`
        );

        const token = Array.from({ length: 4 }, () =>
          Math.floor(1000 + Math.random() * 9000)
        ).join('-');

        const recovered_rands = clearing.debt_recovered_cents / 100;
        const electricity_rands = clearing.electricity_amount_cents / 100;
        const remaining_rands = clearing.remaining_outstanding_cents / 100;

        replyText = `🔌 *Standard Recharge Successful*

*Vending Token:* \`${token}\`
*Purchase Value:* R${parsedAmount.toFixed(2)}

--------------------------------
${clearing.debt_recovered_cents > 0 ? `⚡ *VoltAdvance Clearing:*
- Debt recovered: R${recovered_rands.toFixed(2)}
- Net electricity: R${electricity_rands.toFixed(2)}
- Remaining debt: R${remaining_rands.toFixed(2)}` : 'No outstanding debt. Full electricity value issued.'}

Stay powered. 💛`;
        session.state = 'IDLE';
      } else {
        replyText = 'Please enter a valid amount in Rands to buy electricity (e.g. 100).';
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
        const amount_cents = Math.round(amount * 100);
        const fee_cents = Math.round(amount_cents * 0.1);
        const total_owed_cents = amount_cents + fee_cents;

        // 1. Get or create borrower
        let borrower = await db.getBorrowerByPhone(phone);
        if (!borrower) {
          borrower = await db.createBorrower({
            phone_number: phone,
            trust_score: 75,
            risk_tier: 'STANDARD',
            total_active_exposure_cents: 0,
            total_repaid_cents: 0
          });
        }

        // 2. Get or create meter
        let meter = await db.getMeterByNumber(session.meterNumber || '123456789');
        if (!meter) {
          meter = await db.createMeter({
            meter_number: session.meterNumber || '123456789',
            provider_name: 'City Power',
            status: 'ACTIVE'
          });
        }

        // 3. Evaluate risk
        const risk = evaluateRisk({
          phone_number: phone,
          meter_age_days: 200,
          purchase_frequency_per_month: 4,
          average_purchase_cents: 15000,
          advances_taken: borrower.total_repaid_cents > 0 ? 3 : 0,
          advances_repaid: borrower.total_repaid_cents > 0 ? 3 : 0,
          time_to_repayment_days: 5,
          current_outstanding_cents: meter.total_outstanding_cents,
          linked_phone_count: 1,
          suspicious_patterns: meter.status === 'FLAGGED',
        });

        if (risk.approved && amount_cents <= risk.advance_limit_cents) {
          const advance_reference = `ADV-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;
          const token = Array.from({ length: 4 }, () =>
            Math.floor(1000 + Math.random() * 9000)
          ).join('-');

          // Create advance record
          const advance = await db.createAdvance({
            advance_reference,
            borrower_id: borrower.id,
            meter_id: meter.id,
            principal_cents: amount_cents,
            fee_cents,
            outstanding_cents: total_owed_cents,
            repaid_cents: 0,
            status: 'ACTIVE',
            issued_via: 'WHATSAPP',
            consent_snapshot: true
          });

          // Update database balances
          await db.updateMeterBalance(meter.id, total_owed_cents);
          await db.updateBorrowerExposure(borrower.id, total_owed_cents);

          // Log system event
          await db.createSystemEvent({
            event_type: 'ADVANCE_ISSUED',
            reference_id: advance.id,
            reference_type: 'advance',
            payload: { amount: amount_cents, meter: meter.meter_number }
          });

          replyText = `✅ *Advance Approved!*

*Amount:* R${amount.toFixed(2)}
*Fee:* R${(amount * 0.1).toFixed(2)} _(recovered automatically)_
*Total owed:* R${(amount * 1.1).toFixed(2)}

Your electricity token:
\`${token}\`

🔌 Token valid for meter: ${meter.meter_number}
💡 Repayment: automatic on next purchase

Stay powered. 💛`;
        } else {
          replyText = `❌ *Advance Declined*\n\nReason: ${amount_cents > risk.advance_limit_cents ? `Requested amount exceeds dynamic limit of R${(risk.advance_limit_cents / 100).toFixed(2)}.` : 'Risk evaluation failed.'}`;
        }
        session.state = 'IDLE';
      } else {
        replyText = 'Please choose 1–4 or type an amount between R20 and R300.';
      }
    } else if (session.state === 'AWAITING_METER') {
      const meterNum = normalized.match(/\d{6,12}/)?.[0] || normalized;
      replyText = await getMeterStatusString(meterNum);
      session.state = 'IDLE';
    }

    globalSessionMap.set(phone, session);

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

async function getMeterStatusString(meterNum: string): Promise<string> {
  const meter = await db.getMeterByNumber(meterNum);
  if (!meter) {
    return `🔌 *Meter: ${meterNum}*

Status: Not found in registry.
Please check the meter number and try again.`;
  }

  const active = await db.getActiveAdvancesForMeter(meter.id);

  return `🔌 *Meter Status: ${meter.meter_number}*

Provider: ${meter.provider_name || 'City Power'}
Status: ${meter.status === 'ACTIVE' ? '✅ Active' : '⚠️ ' + meter.status}
Outstanding: R${(meter.total_outstanding_cents / 100).toFixed(2)}
Active Advances: ${active.length}
Last activity: ${meter.last_activity_at ? new Date(meter.last_activity_at).toLocaleDateString() : 'N/A'}`;
}
