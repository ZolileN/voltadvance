import { createClient } from '@supabase/supabase-js';
import * as mock from './mock-data';
import { Borrower, Meter, Advance, RecoveryTransaction, SystemEvent } from './types';

// Read database environment variables safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role client if available (bypass RLS for server-side APIs), fallback to anon
const activeKey = serviceRoleKey || supabaseAnonKey;
export const dbClient = (supabaseUrl && activeKey) ? createClient(supabaseUrl, activeKey) : null;

// Persistent mock store for local development session state
const globalStore = (global as any)._mockDbStore || {
  borrowers: [...mock.mockBorrowers],
  meters: [...mock.mockMeters],
  advances: [...mock.mockAdvances],
  recovery_transactions: [...mock.mockRecoveryTransactions],
  system_events: [...mock.mockSystemEvents],
  meter_purchases: [...mock.mockMeterPurchases],
  meter_borrower_links: mock.mockAdvances.map((a: any, idx: number) => ({
    id: `l-seed-${idx}`,
    meter_id: a.meter_id,
    borrower_id: a.borrower_id,
    relationship_type: 'USER',
    active: true,
    active_from: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  }))
};

if (process.env.NODE_ENV !== 'production') {
  (global as any)._mockDbStore = globalStore;
}

export const db = {
  // --- DEBT OBLIGORS (BORROWERS) ---
  async getBorrowerByPhone(phone: string): Promise<Borrower | null> {
    if (!dbClient) return globalStore.borrowers.find((b: any) => b.phone_number === phone) || null;
    try {
      const { data, error } = await dbClient
        .from('debt_obligors')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in getBorrowerByPhone, falling back to mock:', e);
      return globalStore.borrowers.find((b: any) => b.phone_number === phone) || null;
    }
  },

  async getLinkedMeterForPhone(phone: string): Promise<Meter | null> {
    if (!dbClient) {
      // Find borrower first
      const borrower = globalStore.borrowers.find((b: any) => b.phone_number === phone);
      if (!borrower) return null;
      // Find active link
      const link = globalStore.meter_borrower_links?.find(
        (l: any) => l.borrower_id === borrower.id && l.active === true
      );
      if (!link) return null;
      return globalStore.meters.find((m: any) => m.id === link.meter_id) || null;
    }
    try {
      const borrower = await this.getBorrowerByPhone(phone);
      if (!borrower) return null;

      const { data: link, error: linkErr } = await dbClient
        .from('utility_obligation_maps')
        .select('meter_id')
        .eq('borrower_id', borrower.id)
        .eq('active', true)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link) return null;

      const { data: meter, error: meterErr } = await dbClient
        .from('physical_meters')
        .select('*')
        .eq('id', link.meter_id)
        .single();
      if (meterErr) throw meterErr;
      return meter;
    } catch (e) {
      console.warn('DB Error in getLinkedMeterForPhone:', e);
      return null;
    }
  },

  async linkMeterToBorrower(borrowerId: string, meterId: string): Promise<any> {
    const newLink = {
      id: `l-${Date.now()}`,
      meter_id: meterId,
      borrower_id: borrowerId,
      relationship_type: 'USER',
      active: true,
      active_from: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
    if (!dbClient) {
      if (!globalStore.meter_borrower_links) {
        globalStore.meter_borrower_links = [];
      }
      // Deactivate existing
      globalStore.meter_borrower_links.forEach((l: any) => {
        if (l.borrower_id === borrowerId) l.active = false;
      });
      globalStore.meter_borrower_links.push(newLink);
      return newLink;
    }
    try {
      // Deactivate any existing active link for this borrower
      await dbClient
        .from('utility_obligation_maps')
        .update({ active: false, active_to: new Date().toISOString() })
        .eq('borrower_id', borrowerId)
        .eq('active', true);

      // Insert new link
      const { data, error } = await dbClient
        .from('utility_obligation_maps')
        .insert({
          meter_id: meterId,
          borrower_id: borrowerId,
          relationship_type: 'USER',
          active: true
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in linkMeterToBorrower, falling back to mock:', e);
      if (!globalStore.meter_borrower_links) {
        globalStore.meter_borrower_links = [];
      }
      globalStore.meter_borrower_links.forEach((l: any) => {
        if (l.borrower_id === borrowerId) l.active = false;
      });
      globalStore.meter_borrower_links.push(newLink);
      return newLink;
    }
  },

  async getBorrowers(): Promise<Borrower[]> {
    if (!dbClient) return globalStore.borrowers;
    try {
      const { data, error } = await dbClient
        .from('debt_obligors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getBorrowers, falling back to mock:', e);
      return globalStore.borrowers;
    }
  },

  async createBorrower(borrower: Omit<Borrower, 'id' | 'created_at' | 'updated_at'>): Promise<Borrower> {
    const newBorrower = {
      ...borrower,
      id: `b-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!dbClient) {
      globalStore.borrowers.push(newBorrower);
      return newBorrower;
    }
    try {
      const { data, error } = await dbClient
        .from('debt_obligors')
        .insert(borrower)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in createBorrower, falling back to mock:', e);
      globalStore.borrowers.push(newBorrower);
      return newBorrower;
    }
  },

  // --- PHYSICAL METERS ---
  async getMeterByNumber(meterNumber: string): Promise<Meter | null> {
    if (!dbClient) return globalStore.meters.find((m: any) => m.meter_number === meterNumber) || null;
    try {
      const { data, error } = await dbClient
        .from('physical_meters')
        .select('*')
        .eq('meter_number', meterNumber)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in getMeterByNumber, falling back to mock:', e);
      return globalStore.meters.find((m: any) => m.meter_number === meterNumber) || null;
    }
  },

  async getMeters(): Promise<Meter[]> {
    if (!dbClient) return globalStore.meters;
    try {
      const { data, error } = await dbClient
        .from('physical_meters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getMeters, falling back to mock:', e);
      return globalStore.meters;
    }
  },

  async createMeter(meter: Omit<Meter, 'id' | 'created_at' | 'updated_at' | 'total_outstanding_cents' | 'last_activity_at' | 'vending_integration_type' | 'clearing_status'> & Partial<Pick<Meter, 'vending_integration_type' | 'clearing_status'>>): Promise<Meter> {
    const newMeter = {
      ...meter,
      id: `m-${Date.now()}`,
      vending_integration_type: meter.vending_integration_type || 'SWITCH_INTERCEPT',
      clearing_status: meter.clearing_status || 'NOMINAL',
      total_outstanding_cents: 0,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!dbClient) {
      globalStore.meters.push(newMeter);
      return newMeter;
    }
    try {
      const { data, error } = await dbClient
        .from('physical_meters')
        .insert(meter)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in createMeter, falling back to mock:', e);
      globalStore.meters.push(newMeter);
      return newMeter;
    }
  },

  async updateMeterBalance(meterId: string, outstandingDeltaCents: number) {
    if (!dbClient) {
      const m = globalStore.meters.find((m: any) => m.id === meterId);
      if (m) {
        m.total_outstanding_cents = Math.max(0, m.total_outstanding_cents + outstandingDeltaCents);
        m.last_activity_at = new Date().toISOString();
      }
      return;
    }
    try {
      const { data: meter, error: fetchErr } = await dbClient
        .from('physical_meters')
        .select('total_outstanding_cents')
        .eq('id', meterId)
        .single();
      if (fetchErr) throw fetchErr;

      const newBalance = Math.max(0, (meter?.total_outstanding_cents || 0) + outstandingDeltaCents);
      const { error: updateErr } = await dbClient
        .from('physical_meters')
        .update({
          total_outstanding_cents: newBalance,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', meterId);
      if (updateErr) throw updateErr;
    } catch (e) {
      console.warn('DB Error in updateMeterBalance, falling back to mock:', e);
      const m = globalStore.meters.find((m: any) => m.id === meterId);
      if (m) {
        m.total_outstanding_cents = Math.max(0, m.total_outstanding_cents + outstandingDeltaCents);
        m.last_activity_at = new Date().toISOString();
      }
    }
  },

  async updateBorrowerExposure(borrowerId: string, exposureDeltaCents: number) {
    if (!dbClient) {
      const b = globalStore.borrowers.find((b: any) => b.id === borrowerId);
      if (b) {
        b.total_active_exposure_cents = Math.max(0, b.total_active_exposure_cents + exposureDeltaCents);
        b.updated_at = new Date().toISOString();
      }
      return;
    }
    try {
      const { data: borrower, error: fetchErr } = await dbClient
        .from('debt_obligors')
        .select('total_active_exposure_cents')
        .eq('id', borrowerId)
        .single();
      if (fetchErr) throw fetchErr;

      const newExposure = Math.max(0, (borrower?.total_active_exposure_cents || 0) + exposureDeltaCents);
      const { error: updateErr } = await dbClient
        .from('debt_obligors')
        .update({
          total_active_exposure_cents: newExposure,
          updated_at: new Date().toISOString()
        })
        .eq('id', borrowerId);
      if (updateErr) throw updateErr;
    } catch (e) {
      console.warn('DB Error in updateBorrowerExposure, falling back to mock:', e);
      const b = globalStore.borrowers.find((b: any) => b.id === borrowerId);
      if (b) {
        b.total_active_exposure_cents = Math.max(0, b.total_active_exposure_cents + exposureDeltaCents);
        b.updated_at = new Date().toISOString();
      }
    }
  },

  // --- CREDIT ADVANCES ---
  async getAdvances(): Promise<Advance[]> {
    if (!dbClient) return globalStore.advances;
    try {
      const { data, error } = await dbClient
        .from('credit_advances')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getAdvances, falling back to mock:', e);
      return globalStore.advances;
    }
  },

  async getActiveAdvancesForMeter(meterId: string): Promise<Advance[]> {
    if (!dbClient) {
      return globalStore.advances.filter((a: any) => a.meter_id === meterId && (a.status === 'ACTIVE' || a.status === 'PARTIALLY_REPAID'));
    }
    try {
      const { data, error } = await dbClient
        .from('credit_advances')
        .select('*')
        .eq('meter_id', meterId)
        .in('status', ['ACTIVE', 'PARTIALLY_REPAID'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getActiveAdvancesForMeter, falling back to mock:', e);
      return globalStore.advances.filter((a: any) => a.meter_id === meterId && (a.status === 'ACTIVE' || a.status === 'PARTIALLY_REPAID'));
    }
  },

  async createAdvance(advance: Omit<Advance, 'id' | 'created_at' | 'updated_at'>): Promise<Advance> {
    const newAdvance = {
      ...advance,
      id: `a-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!dbClient) {
      globalStore.advances.push(newAdvance);
      return newAdvance;
    }
    try {
      const { data, error } = await dbClient
        .from('credit_advances')
        .insert(advance)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in createAdvance, falling back to mock:', e);
      globalStore.advances.push(newAdvance);
      return newAdvance;
    }
  },

  async updateAdvanceRepayment(advanceId: string, repaidDeltaCents: number, newStatus: any) {
    if (!dbClient) {
      const a = globalStore.advances.find((a: any) => a.id === advanceId);
      if (a) {
        a.repaid_cents += repaidDeltaCents;
        a.outstanding_cents = Math.max(0, a.outstanding_cents - repaidDeltaCents);
        a.status = newStatus;
        a.updated_at = new Date().toISOString();
      }
      return;
    }
    try {
      const { data: adv, error: fetchErr } = await dbClient
        .from('credit_advances')
        .select('repaid_cents, outstanding_cents')
        .eq('id', advanceId)
        .single();
      if (fetchErr) throw fetchErr;

      const newRepaid = (adv?.repaid_cents || 0) + repaidDeltaCents;
      const newOutstanding = Math.max(0, (adv?.outstanding_cents || 0) - repaidDeltaCents);

      const { error: updateErr } = await dbClient
        .from('credit_advances')
        .update({
          repaid_cents: newRepaid,
          outstanding_cents: newOutstanding,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', advanceId);
      if (updateErr) throw updateErr;
    } catch (e) {
      console.warn('DB Error in updateAdvanceRepayment, falling back to mock:', e);
      const a = globalStore.advances.find((a: any) => a.id === advanceId);
      if (a) {
        a.repaid_cents += repaidDeltaCents;
        a.outstanding_cents = Math.max(0, a.outstanding_cents - repaidDeltaCents);
        a.status = newStatus;
        a.updated_at = new Date().toISOString();
      }
    }
  },

  // --- RECOVERY (LEDGER JOURNAL ENTRIES) ---
  async getRecoveryTransactions(): Promise<RecoveryTransaction[]> {
    if (!dbClient) return globalStore.recovery_transactions;
    try {
      const { data, error } = await dbClient
        .from('ledger_journal_entries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getRecoveryTransactions, falling back to mock:', e);
      return globalStore.recovery_transactions;
    }
  },

  async createRecoveryTransaction(txn: Omit<RecoveryTransaction, 'id' | 'created_at'>): Promise<RecoveryTransaction> {
    const newTxn = {
      ...txn,
      id: `rt-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    if (!dbClient) {
      globalStore.recovery_transactions.push(newTxn);
      return newTxn;
    }
    try {
      const { data, error } = await dbClient
        .from('ledger_journal_entries')
        .insert(txn)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in createRecoveryTransaction, falling back to mock:', e);
      globalStore.recovery_transactions.push(newTxn);
      return newTxn;
    }
  },

  // --- SYSTEM EVENTS ---
  async getSystemEvents(): Promise<SystemEvent[]> {
    if (!dbClient) return globalStore.system_events;
    try {
      const { data, error } = await dbClient
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getSystemEvents, falling back to mock:', e);
      return globalStore.system_events;
    }
  },

  async createSystemEvent(event: Omit<SystemEvent, 'id' | 'created_at'>): Promise<SystemEvent> {
    const newEvent = {
      ...event,
      id: `se-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    if (!dbClient) {
      globalStore.system_events.unshift(newEvent);
      return newEvent;
    }
    try {
      const { data, error } = await dbClient
        .from('system_events')
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in createSystemEvent, falling back to mock:', e);
      globalStore.system_events.unshift(newEvent);
      return newEvent;
    }
  },

  // --- INTEGRATION INTERCEPT EVENTS (METER PURCHASES) ---
  async getMeterPurchases(): Promise<any[]> {
    if (!dbClient) return globalStore.meter_purchases;
    try {
      const { data, error } = await dbClient
        .from('integration_intercept_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('DB Error in getMeterPurchases, falling back to mock:', e);
      return globalStore.meter_purchases;
    }
  },

  // --- CLEARING EXECUTION ---
  async executePurchaseClearing(
    meterNumber: string,
    purchaseAmountCents: number,
    channel: string,
    externalTransactionId: string,
    isBorrowerPurchasing = true
  ): Promise<any> {
    if (!dbClient) {
      // Simulate locally
      let meter = globalStore.meters.find((m: any) => m.meter_number === meterNumber);
      if (!meter) {
        meter = {
          id: `m-${Date.now()}`,
          meter_number: meterNumber,
          provider_name: 'City Power',
          status: 'ACTIVE',
          vending_integration_type: 'SWITCH_INTERCEPT',
          clearing_status: 'NOMINAL',
          total_outstanding_cents: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        globalStore.meters.push(meter);
      }

      // Record purchase event
      const purchase = {
        id: `p-${Date.now()}`,
        meter_id: meter.id,
        amount_cents: purchaseAmountCents,
        channel,
        external_transaction_id: externalTransactionId,
        created_at: new Date().toISOString()
      };
      globalStore.meter_purchases.push(purchase);

      const outstanding_cents = meter.total_outstanding_cents;
      let scenario = 'NO_DEBT';
      let debt_recovered_cents = 0;
      let electricity_amount_cents = purchaseAmountCents;

      if (outstanding_cents > 0) {
        // Enforce 50% split cap
        const maxRecovery = Math.floor(purchaseAmountCents * 0.5);
        debt_recovered_cents = Math.min(outstanding_cents, maxRecovery);
        electricity_amount_cents = purchaseAmountCents - debt_recovered_cents;
        scenario = debt_recovered_cents === outstanding_cents ? 'FULL_RECOVERY' : 'PARTIAL_RECOVERY';

        // Apply to advances sequentially
        const activeAdvances = globalStore.advances.filter(
          (a: any) => a.meter_id === meter.id && (a.status === 'ACTIVE' || a.status === 'PARTIALLY_REPAID')
        ).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let remainingRecovery = debt_recovered_cents;
        for (const advance of activeAdvances) {
          if (remainingRecovery <= 0) break;
          const deduction = Math.min(advance.outstanding_cents, remainingRecovery);
          remainingRecovery -= deduction;

          advance.repaid_cents += deduction;
          advance.outstanding_cents -= deduction;
          advance.status = advance.outstanding_cents <= 0 ? 'SETTLED' : 'PARTIALLY_REPAID';
          advance.updated_at = new Date().toISOString();

          // Create recovery transaction (ledger journal entry)
          const rt = {
            id: `rt-${Date.now()}-${Math.random()}`,
            advance_id: advance.id,
            meter_id: meter.id,
            amount_cents: deduction,
            channel,
            event_type: advance.status === 'SETTLED' ? 'FULL' : 'PARTIAL',
            external_transaction_id: externalTransactionId,
            created_at: new Date().toISOString()
          };
          globalStore.recovery_transactions.push(rt);

          // Update borrower totals
          const b = globalStore.borrowers.find((b: any) => b.id === advance.borrower_id);
          if (b) {
            b.total_active_exposure_cents = Math.max(0, b.total_active_exposure_cents - deduction);
            b.total_repaid_cents += deduction;
            b.updated_at = new Date().toISOString();
          }
        }

        meter.total_outstanding_cents = Math.max(0, meter.total_outstanding_cents - debt_recovered_cents);
        meter.last_activity_at = new Date().toISOString();
      }

      // Log system event
      const se = {
        id: `se-${Date.now()}`,
        event_type: 'RECOVERY_APPLIED',
        reference_id: purchase.id,
        reference_type: 'purchase',
        payload: {
          meter_number: meterNumber,
          purchase_amount_cents: purchaseAmountCents,
          debt_recovered_cents,
          electricity_amount_cents,
          scenario
        },
        created_at: new Date().toISOString()
      };
      globalStore.system_events.unshift(se);

      return {
        success: true,
        meter_number: meterNumber,
        scenario,
        purchase_amount_cents: purchaseAmountCents,
        debt_recovered_cents,
        electricity_amount_cents,
        remaining_outstanding_cents: meter.total_outstanding_cents
      };
    }

    try {
      const { data, error } = await dbClient.rpc('execute_purchase_clearing_v1', {
        p_meter_number: meterNumber,
        p_purchase_amount_cents: purchaseAmountCents,
        p_channel: channel,
        p_external_transaction_id: externalTransactionId,
        p_is_borrower_purchasing: isBorrowerPurchasing
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB Error in executePurchaseClearing, falling back to mock:', e);
      return {
        success: false,
        error: String(e)
      };
    }
  }
};
