'use client';
import { mockBorrowers, mockMeters } from '@/lib/mock-data';
import { scoreTierColor, scoreTierLabel } from '@/lib/risk-engine';
import styles from './risk.module.css';

const fraudAlerts = [
  {
    id: 'fa1',
    severity: 'HIGH',
    type: 'MULTI_PHONE_ACTIVITY',
    description: 'Meter 777300400 linked to 4 different phone numbers within 48 hours',
    meter: '777300400',
    detectedAt: '2026-06-01T18:00:00Z',
  },
  {
    id: 'fa2',
    severity: 'MEDIUM',
    type: 'RAPID_ADVANCE_REQUEST',
    description: 'Phone +27600001111 requested advance 3 times within 24h',
    meter: 'N/A',
    detectedAt: '2026-05-28T12:00:00Z',
  },
  {
    id: 'fa3',
    severity: 'LOW',
    type: 'INACTIVITY_SPIKE',
    description: 'Meter 777300400 shows 8-day purchase gap after active advance',
    meter: '777300400',
    detectedAt: '2026-05-25T08:00:00Z',
  },
];

const severityConfig = {
  HIGH: { badge: 'badge-danger', icon: '🚨' },
  MEDIUM: { badge: 'badge-warning', icon: '⚠️' },
  LOW: { badge: 'badge-info', icon: 'ℹ️' },
};

const scoreRanges = [
  { label: '81–100', tier: 'Premium', limit: 'R300', count: mockBorrowers.filter(b => b.trust_score >= 81).length, color: 'var(--color-success)' },
  { label: '61–80', tier: 'Standard', limit: 'R100', count: mockBorrowers.filter(b => b.trust_score >= 61 && b.trust_score <= 80).length, color: 'var(--color-amber)' },
  { label: '41–60', tier: 'Basic', limit: 'R20', count: mockBorrowers.filter(b => b.trust_score >= 41 && b.trust_score <= 60).length, color: 'var(--color-warning)' },
  { label: '0–40', tier: 'Declined', limit: '—', count: mockBorrowers.filter(b => b.trust_score <= 40).length, color: 'var(--color-danger)' },
];

export default function RiskPage() {
  return (
    <div className={styles.page}>
      {/* Trust Score Breakdown */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">🛡 Trust Score Distribution</p>
            <p className="section-subtitle">Advance limits by risk tier</p>
          </div>
        </div>
        <div className={styles.tierGrid}>
          {scoreRanges.map(r => (
            <div key={r.label} className={styles.tierCard} style={{ borderColor: `${r.color}30` }}>
              <div className={styles.tierHeader}>
                <span style={{ color: r.color, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                <span className="badge" style={{ background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}30` }}>
                  {r.tier}
                </span>
              </div>
              <div className={styles.tierCount} style={{ color: r.color }}>{r.count}</div>
              <div className={styles.tierLabel}>borrowers</div>
              <div className={styles.tierLimit}>
                <span>Max advance</span>
                <span style={{ color: r.color, fontWeight: 700 }}>{r.limit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High Risk Meters */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">🔌 High Risk Meters</p>
            <p className="section-subtitle">Meters requiring investigation</p>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Meter Number</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Outstanding</th>
                <th>Risk Signals</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {mockMeters.filter(m => m.status === 'FLAGGED' || m.total_outstanding_cents > 20000).map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="font-mono" style={{ fontSize: 13, color: 'var(--color-amber)' }}>
                      {m.meter_number}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{m.provider_name}</td>
                  <td>
                    <span className={`badge ${m.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                    R {(m.total_outstanding_cents / 100).toFixed(2)}
                  </td>
                  <td>
                    {m.status === 'FLAGGED' && (
                      <span className="badge badge-danger">Multi-phone activity</span>
                    )}
                    {m.total_outstanding_cents > 20000 && m.status !== 'FLAGGED' && (
                      <span className="badge badge-warning">High exposure</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {m.last_activity_at ? new Date(m.last_activity_at).toLocaleDateString('en-ZA') : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fraud Alerts */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">🚨 Fraud & Anomaly Alerts</p>
            <p className="section-subtitle">{fraudAlerts.length} active alerts</p>
          </div>
        </div>
        <div className={styles.alertList}>
          {fraudAlerts.map(alert => {
            const cfg = severityConfig[alert.severity as keyof typeof severityConfig];
            return (
              <div key={alert.id} className={styles.alertRow}>
                <div className={styles.alertLeft}>
                  <span className={styles.alertIcon}>{cfg.icon}</span>
                  <div className={styles.alertBody}>
                    <div className={styles.alertTop}>
                      <span className={`badge ${cfg.badge}`}>{alert.severity}</span>
                      <span className="badge badge-neutral">{alert.type.replace(/_/g, ' ')}</span>
                      {alert.meter !== 'N/A' && (
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-amber)' }}>
                          Meter: {alert.meter}
                        </span>
                      )}
                    </div>
                    <p className={styles.alertDesc}>{alert.description}</p>
                  </div>
                </div>
                <div className={styles.alertTime}>
                  {new Date(alert.detectedAt).toLocaleDateString('en-ZA')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
