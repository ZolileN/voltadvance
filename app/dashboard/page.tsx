'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { mockDashboardMetrics, advanceVolumeData, riskDistributionData, channelRecoveryData, mockSystemEvents } from '@/lib/mock-data';
import styles from './overview.module.css';

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const eventTypeConfig: Record<string, { badge: string; label: string }> = {
  ADVANCE_ISSUED: { badge: 'badge-amber', label: 'Advance Issued' },
  RECOVERY_APPLIED: { badge: 'badge-success', label: 'Recovery Applied' },
  FRAUD_FLAG: { badge: 'badge-danger', label: 'Fraud Flag' },
  VENDOR_FAILURE: { badge: 'badge-warning', label: 'Vendor Failure' },
  ERROR: { badge: 'badge-danger', label: 'Error' },
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number; name: string; color: string}>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className={styles.chartTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: 12 }}>
            {p.name}: {formatCents(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const m = mockDashboardMetrics;

  return (
    <div className={styles.page}>
      {/* Top Metrics */}
      <div className={styles.metricsGrid}>
        <div className="metric-card">
          <span className="metric-label">Total Outstanding</span>
          <span className="metric-value text-amber">{formatCents(m.total_outstanding_cents)}</span>
          <div className="metric-delta neutral">Active exposure across all meters</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Recovered Today</span>
          <span className="metric-value" style={{color: 'var(--color-success)'}}>{formatCents(m.total_recovered_today_cents)}</span>
          <div className="metric-delta positive">↑ R4,200 vs yesterday</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Recovery Rate</span>
          <span className="metric-value" style={{color: 'var(--color-success)'}}>{m.recovery_rate}%</span>
          <div className="metric-delta positive">↑ 0.3% this week</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Advances</span>
          <span className="metric-value">{m.total_advances_issued}</span>
          <div className="metric-delta neutral">{m.active_meters} active meters</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Default Rate</span>
          <span className="metric-value" style={{color: 'var(--color-danger)'}}>{m.default_rate}%</span>
          <div className="metric-delta positive">↓ 0.2% improvement</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Fraud Alerts</span>
          <span className="metric-value" style={{color: 'var(--color-warning)'}}>{m.fraud_alerts}</span>
          <div className="metric-delta negative">1 high-risk meter flagged</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Advance Volume Chart */}
        <div className={`card ${styles.chartCard}`}>
          <div className="section-header">
            <div>
              <p className="section-title">Advance Volume vs Recovery</p>
              <p className="section-subtitle">30-day rolling window</p>
            </div>
            <span className="badge badge-live">
              <span className="pulse-dot" />
              Live
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={advanceVolumeData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-amber)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-amber)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R${v/100}`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="amount" name="Issued" stroke="var(--color-amber)" fill="url(#amountGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="recovered" name="Recovered" stroke="var(--color-success)" fill="url(#recoveredGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className={`card ${styles.riskCard}`}>
          <div className="section-header">
            <div>
              <p className="section-title">Borrower Risk Tiers</p>
              <p className="section-subtitle">Trust score distribution</p>
            </div>
          </div>
          <div className={styles.donutRow}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.legend}>
              {riskDistributionData.map((d, i) => (
                <div key={i} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: d.color }} />
                  <span className={styles.legendLabel}>{d.name}</span>
                  <span className={styles.legendValue}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Channel Recovery Performance */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">Recovery Engine — Channel Performance</p>
            <p className="section-subtitle">Success rate per vending partner</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={channelRecoveryData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="channel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[80, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Success Rate']}
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Bar dataKey="success" fill="var(--color-amber)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction Stream */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">📡 Transaction Stream</p>
            <p className="section-subtitle">Real-time system events</p>
          </div>
          <span className="badge badge-live">
            <span className="pulse-dot" />
            Live feed
          </span>
        </div>
        <div className={styles.eventStream}>
          {mockSystemEvents.map((event) => {
            const cfg = eventTypeConfig[event.event_type] || { badge: 'badge-neutral', label: event.event_type };
            return (
              <div key={event.id} className={styles.eventRow}>
                <div className={styles.eventTime}>{timeAgo(event.created_at)}</div>
                <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                <div className={styles.eventPayload}>
                  {event.payload && Object.entries(event.payload).map(([k, v]) => (
                    <span key={k} className={styles.payloadChip}>
                      {k}: <strong>{String(v)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
