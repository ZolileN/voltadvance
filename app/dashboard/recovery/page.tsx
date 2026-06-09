'use client';
import { mockRecoveryTransactions, mockMeters, mockAdvances, channelRecoveryData } from '@/lib/mock-data';
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

// Pure SVG Radar Chart
function RadarChart({ data }: { data: { channel: string; success: number }[] }) {
  const cx = 140; const cy = 140; const r = 100;
  const n = data.length;
  const minVal = 80; const maxVal = 100;

  const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map(lvl => {
    const pts = data.map((_, i) => {
      const a = angle(i);
      return `${cx + r * lvl * Math.cos(a)},${cy + r * lvl * Math.sin(a)}`;
    }).join(' ');
    return pts;
  });

  const dataPoints = data.map((d, i) => {
    const normalized = (d.success - minVal) / (maxVal - minVal);
    const a = angle(i);
    return `${cx + r * normalized * Math.cos(a)},${cy + r * normalized * Math.sin(a)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 280 280" className={styles.radarSvg}>
      {/* Grid polygons */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {data.map((_, i) => {
        const a = angle(i);
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(a)}
            y2={cy + r * Math.sin(a)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1"
          />
        );
      })}
      {/* Data polygon */}
      <polygon points={dataPoints} fill="rgba(245,158,11,0.15)" stroke="#F59E0B" strokeWidth="2" />
      {/* Data dots */}
      {data.map((d, i) => {
        const normalized = (d.success - minVal) / (maxVal - minVal);
        const a = angle(i);
        return (
          <circle key={i}
            cx={cx + r * normalized * Math.cos(a)}
            cy={cy + r * normalized * Math.sin(a)}
            r="4" fill="#F59E0B"
          />
        );
      })}
      {/* Labels */}
      {data.map((d, i) => {
        const a = angle(i);
        const lx = cx + (r + 20) * Math.cos(a);
        const ly = cy + (r + 20) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly + 4}
            fill="var(--text-muted)" fontSize="10"
            textAnchor="middle">
            {d.channel}
          </text>
        );
      })}
    </svg>
  );
}

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
          <RadarChart data={channelRecoveryData} />
        </div>
      </div>
    </div>
  );
}
