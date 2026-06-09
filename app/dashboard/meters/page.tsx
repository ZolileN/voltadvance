'use client';
import { mockMeters } from '@/lib/mock-data';
import styles from './meters.module.css';

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-neutral',
    FLAGGED: 'badge-danger',
  };
  return map[status] || 'badge-neutral';
}

function timeSince(dateStr?: string) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MetersPage() {
  const activeCount = mockMeters.filter(m => m.status === 'ACTIVE').length;
  const flaggedCount = mockMeters.filter(m => m.status === 'FLAGGED').length;
  const totalExposure = mockMeters.reduce((s, m) => s + m.total_outstanding_cents, 0);

  return (
    <div className={styles.page}>
      <div className={styles.summaryRow}>
        <div className="metric-card">
          <span className="metric-label">Active Meters</span>
          <span className="metric-value text-amber">{activeCount}</span>
          <div className="metric-delta neutral">registered meters</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Flagged</span>
          <span className="metric-value" style={{color: 'var(--color-danger)'}}>{flaggedCount}</span>
          <div className="metric-delta negative">require investigation</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Meter Exposure</span>
          <span className="metric-value">{formatCents(totalExposure)}</span>
          <div className="metric-delta neutral">across all meters</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">🔌 Meter Registry</p>
            <p className="section-subtitle">{mockMeters.length} meters registered</p>
          </div>
        </div>

        {/* Meter Cards Grid */}
        <div className={styles.meterGrid}>
          {mockMeters.map(meter => (
            <div key={meter.id} className={`${styles.meterCard} ${meter.status === 'FLAGGED' ? styles.meterFlagged : ''}`}>
              <div className={styles.meterHeader}>
                <span className="font-mono" style={{fontSize: 15, fontWeight: 700, color: 'var(--color-amber)'}}>
                  {meter.meter_number}
                </span>
                <span className={`badge ${statusBadge(meter.status)}`}>{meter.status}</span>
              </div>

              <div className={styles.meterProvider}>{meter.provider_name || 'Unknown Provider'}</div>

              <div className={styles.meterStats}>
                <div className={styles.meterStat}>
                  <span className={styles.statLabel}>Outstanding</span>
                  <span className={styles.statVal} style={{
                    color: meter.total_outstanding_cents > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                  }}>
                    {meter.total_outstanding_cents > 0 ? formatCents(meter.total_outstanding_cents) : 'Clear'}
                  </span>
                </div>
                <div className={styles.meterStat}>
                  <span className={styles.statLabel}>Last Activity</span>
                  <span className={styles.statVal}>{timeSince(meter.last_activity_at)}</span>
                </div>
              </div>

              {meter.status === 'FLAGGED' && (
                <div className={styles.flagAlert}>
                  ⚠️ High risk — multi-phone activity detected
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
