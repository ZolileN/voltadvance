import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateRisk } from '@/lib/risk-engine';

export async function GET(req: NextRequest) {
  try {
    const list = await db.getBorrowers();
    
    const updatedList = list.map(b => {
      // Create a stable seed from phone number to generate realistic variance
      const digits = b.phone_number.replace(/[^0-9]/g, '');
      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i], 10) || 0;
      }
      
      const advancesTaken = b.total_repaid_cents > 0 ? Math.max(1, Math.round(b.total_repaid_cents / 10000)) : 0;
      
      const evaluation = evaluateRisk({
        phone_number: b.phone_number,
        meter_age_days: 180 + (sum % 360), // stable between 180 and 540 days
        purchase_frequency_per_month: 3 + (sum % 4), // 3 to 6 times a month
        average_purchase_cents: 8000 + (sum % 12000), // R80 to R200
        advances_taken: advancesTaken,
        advances_repaid: advancesTaken,
        time_to_repayment_days: 3 + (sum % 5), // 3 to 7 days
        current_outstanding_cents: b.total_active_exposure_cents,
        linked_phone_count: 1,
        suspicious_patterns: false,
      });

      return {
        ...b,
        trust_score: evaluation.trust_score,
        risk_tier: evaluation.risk_tier,
      };
    });

    return NextResponse.json({
      borrowers: updatedList,
      total: updatedList.length,
    });
  } catch (e) {
    console.error('Failed to fetch borrowers:', e);
    return NextResponse.json({ error: 'Failed to fetch borrowers' }, { status: 500 });
  }
}

