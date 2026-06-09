'use client';
import { mockSystemEvents, mockMeterPurchases, mockMeters } from '@/lib/mock-data';
import styles from './events.module.css';

const eventConfig: Record<string, { badge: string; icon: string; color: string }> = {
  ADVANCE_ISSUED: { badge: 'badge-amber', icon: '⚡', color: 'var(--color-amber)' },
  RECOVERY_APPLIED: { badge: 'badge-success', icon: '✓', color: 'var(--color-success)' },
  FRAUD_FLAG: { badge: 'badge-danger', icon: '🚨', color: 'var(--color-danger)' },
  VENDOR_FAILURE: { badge: 'badge-warning', icon: '⚠️', color: 'var(--color-warning)' },
  ERROR: { badge: 'badge-danger', icon: '✗', color: 'var(--color-danger)' },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-ZA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: 'numeric', month: 'short',
  });
}

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA')}`;
}

export default function EventsPage() {
  const purchases = mockMeterPurchases.map(p => ({
    ...p,
    meter_number: mockMeters.find(m => m.id === p.meter_id)?.meter_number || 'N/A',
  }));

  return (
    <div className={styles.page}>
      <div className={styles.twoCol}>
        {/* System Events Stream */}
        <div className="card">
          <div className="section-header">
            <div>
              <p className="section-title">📡 System Event Stream</p>
              <p className="section-subtitle">Real-time operational events</p>
            </div>
            <span className="badge badge-live">
              <span className="pulse-dot" />
              Live
            </span>
          </div>
          <div className={styles.stream}>
            {[...mockSystemEvents].reverse().map(event => {
              const cfg = eventConfig[event.event_type] || { badge: 'badge-neutral', icon: '•', color: 'var(--text-muted)' };
              return (
                <div key={event.id} className={styles.eventRow}>
                  <div className={styles.eventIconCol}>
                    <div className={styles.eventIcon} style={{ background: `${cfg.color}18`, borderColor: `${cfg.color}30` }}>
                      <span style={{fontSize: 14}}>{cfg.icon}</span>
                    </div>
                    <div className={styles.eventLine} />
                  </div>
                  <div className={styles.eventBody}>
                    <div className={styles.eventTop}>
                      <span className={`badge ${cfg.badge}`}>{event.event_type.replace(/_/g, ' ')}</span>
                      <span className={styles.eventTime}>{formatTime(event.created_at)}</span>
                    </div>
                    {event.payload && (
                      <div className={styles.payloadRow}>
                        {Object.entries(event.payload).map(([k, v]) => (
                          <div key={k} className={styles.payloadItem}>
                            <span className={styles.payloadKey}>{k}</span>
                            <span className={styles.payloadVal}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {event.reference_type && (
                      <p className={styles.refText}>
                        ref: <span className="font-mono">{event.reference_type}:{event.reference_id?.slice(0, 8)}…</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Events */}
        <div className="card">
          <div className="section-header">
            <div>
              <p className="section-title">🔌 Electricity Purchases</p>
              <p className="section-subtitle">All meter purchase events</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Meter</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span className="font-mono" style={{fontSize: 12, color: 'var(--color-amber)'}}>
                        {p.meter_number}
                      </span>
                    </td>
                    <td><strong>{formatCents(p.amount_cents)}</strong></td>
                    <td><span className="badge badge-neutral">{p.channel}</span></td>
                    <td style={{fontSize: 11, color: 'var(--text-muted)'}}>
                      {new Date(p.created_at).toLocaleString('en-ZA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
