'use client';
import { mockRecoveryTransactions, mockMeters, mockAdvances } from '@/lib/mock-data';
import { channelRecoveryData } from '@/lib/mock-data';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import styles from './recovery.module.css';

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

const eventTypeConfig: Record<string, { badge: string; icon: string }> = {
  INTERCEPT: { badge: 'badge-amber', icon: '⚡' },
  PARTIAL: { badge: 'badge-info', icon: '◑' },
  FULL: { badge: 'badge-success', icon: '✓' },
  FAILED: { badge: 'badge-danger', icon: '✗' },
  REVERSAL: { badge: 'badge-warning', icon: '↩' },
};

const radarData = channelRecoveryData.map(d => ({ subject: d.channel, rate: d.success }));

export default function RecoveryPage() {
  const transactions = mockRecoveryTransactions.map(rt => ({
    ...rt,
    meter_number: mockMeters.find(m => m.id === rt.meter_id)?.meter_number || 'N/A',
    advance_ref: mockAdvances.find(a => a.id === rt.advance_id)?.advance_reference || 'N/A',
  }));

  const totalRecovered = transactions
    .filter(t => t.event_type !== 'FAILED')
    .reduce((s, t) => s + t.amount_cents, 0);
  const successRate = Math.round(
    (transactions.filter(t => t.event_type !== 'FAILED').length / transactions.length) * 100
  );

  return (
    <div className={styles.page}>
      <div className={styles.summaryRow}>
        <div className="metric-card">
          <span className="metric-label">Total Recovered</span>
          <span className="metric-value text-amber">{formatCents(totalRecovered)}</span>
          <div className="metric-delta neutral">all-time</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Intercept Rate</span>
          <span className="metric-value" style={{color: 'var(--color-success)'}}>{successRate}%</span>
          <div className="metric-delta positive">of purchase attempts</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Failed Intercepts</span>
          <span className="metric-value" style={{color: 'var(--color-danger)'}}>
            {transactions.filter(t => t.event_type === 'FAILED').length}
          </span>
          <div className="metric-delta negative">need investigation</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Transaction Log */}
        <div className="card">
          <div className="section-header">
            <div>
              <p className="section-title">🔄 Recovery Transactions</p>
              <p className="section-subtitle">{transactions.length} events logged</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Advance</th>
                  <th>Meter</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Type</th>
                  <th>Ext. ID</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const cfg = eventTypeConfig[t.event_type] || { badge: 'badge-neutral', icon: '?' };
                  return (
                    <tr key={t.id}>
                      <td>
                        <span className="font-mono" style={{fontSize: 11, color: 'var(--color-amber)'}}>
                          {t.advance_ref}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{fontSize: 11, color: 'var(--text-secondary)'}}>
                          {t.meter_number}
                        </span>
                      </td>
                      <td><strong>{formatCents(t.amount_cents)}</strong></td>
                      <td><span className="badge badge-neutral">{t.channel}</span></td>
                      <td>
                        <span className={`badge ${cfg.badge}`}>
                          {cfg.icon} {t.event_type}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{fontSize: 10, color: 'var(--text-muted)'}}>
                          {t.external_transaction_id || '—'}
                        </span>
                      </td>
                      <td style={{fontSize: 11, color: 'var(--text-muted)'}}>
                        {new Date(t.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="card">
          <p className="section-title">Channel Reliability Radar</p>
          <p className="section-subtitle" style={{marginBottom: 'var(--space-4)'}}>Recovery success rate by vending partner</p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Radar dataKey="rate" stroke="var(--color-amber)" fill="var(--color-amber)" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, 'Success Rate']}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
