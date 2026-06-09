'use client';
import { useState, useEffect } from 'react';
import { mockDashboardMetrics, advanceVolumeData, riskDistributionData, channelRecoveryData, mockSystemEvents } from '@/lib/mock-data';
import styles from './overview.module.css';

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
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

// Pure CSS Area Chart
function AreaChart({ data }: { data: typeof advanceVolumeData }) {
  const maxVal = Math.max(...data.map(d => d.amount));
  const w = 600; const h = 160; const pad = { t: 10, r: 10, b: 30, l: 50 };
  const gw = w - pad.l - pad.r; const gh = h - pad.t - pad.b;

  const points = (key: 'amount' | 'recovered') =>
    data.map((d, i) => {
      const x = pad.l + (i / (data.length - 1)) * gw;
      const y = pad.t + gh - (d[key] / maxVal) * gh;
      return `${x},${y}`;
    }).join(' ');

  const area = (key: 'amount' | 'recovered') => {
    const firstX = pad.l;
    const lastX = pad.l + gw;
    const baseY = pad.t + gh;
    return `${firstX},${baseY} ${points(key)} ${lastX},${baseY}`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.svgChart}>
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.t + gh * (1 - t);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={pad.l + gw} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <text x={pad.l - 6} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
              R{Math.round((maxVal * t) / 100)}
            </text>
          </g>
        );
      })}
      {/* X labels */}
      {data.filter((_, i) => i % 3 === 0).map((d, i) => {
        const idx = i * 3;
        const x = pad.l + (idx / (data.length - 1)) * gw;
        return <text key={i} x={x} y={h - 6} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{d.date}</text>;
      })}
      {/* Areas */}
      <polygon points={area('amount')} fill="url(#grad1)"/>
      <polygon points={area('recovered')} fill="url(#grad2)"/>
      {/* Lines */}
      <polyline points={points('amount')} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round"/>
      <polyline points={points('recovered')} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinejoin="round"/>
      {/* Legend */}
      <circle cx={pad.l + 4} cy={10} r="4" fill="#F59E0B"/>
      <text x={pad.l + 12} y={14} fill="var(--text-secondary)" fontSize="9">Issued</text>
      <circle cx={pad.l + 55} cy={10} r="4" fill="#22C55E"/>
      <text x={pad.l + 63} y={14} fill="var(--text-secondary)" fontSize="9">Recovered</text>
    </svg>
  );
}

// Pure CSS Donut
function DonutChart({ data }: { data: typeof riskDistributionData }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 60; const cx = 80; const cy = 80; const innerR = 36;
  let angle = -90;

  const slices = data.map(d => {
    const sweep = (d.value / total) * 360;
    const a1 = (angle * Math.PI) / 180;
    const a2 = ((angle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
    const ix1 = cx + innerR * Math.cos(a1); const iy1 = cy + innerR * Math.sin(a1);
    const ix2 = cx + innerR * Math.cos(a2); const iy2 = cy + innerR * Math.sin(a2);
    const lg = sweep > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${lg} 0 ${ix1} ${iy1} Z`;
    angle += sweep;
    return { ...d, path };
  });

  return (
    <div className={styles.donutRow}>
      <svg viewBox="0 0 160 160" width={140} height={140}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.9} />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Total</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">{total}</text>
      </svg>
      <div className={styles.legend}>
        {data.map((d, i) => (
          <div key={i} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: d.color }} />
            <span className={styles.legendLabel}>{d.name}</span>
            <span className={styles.legendValue}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pure CSS Bar Chart
function BarChart({ data }: { data: typeof channelRecoveryData }) {
  const minVal = 80; const maxVal = 100;
  const range = maxVal - minVal;

  return (
    <div className={styles.barChart}>
      {data.map((d, i) => {
        const pct = ((d.success - minVal) / range) * 100;
        return (
          <div key={i} className={styles.barGroup}>
            <div className={styles.barLabel}>{d.channel}</div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${pct}%`, background: d.success >= 96 ? 'var(--color-success)' : d.success >= 93 ? 'var(--color-amber)' : 'var(--color-warning)' }}
              />
            </div>
            <div className={styles.barValue}>{d.success}%</div>
          </div>
        );
      })}
    </div>
  );
}

// Live ticker for recovered today
function LiveTicker({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.round(start));
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <>{formatCents(val)}</>;
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="pulse-dot" style={{ margin: '0 auto var(--space-4) auto', float: 'none' }} />
          <p className="section-title">Loading VoltAdvance Console...</p>
          <p className="section-subtitle">Aggregating utility ledger telemetry</p>
        </div>
      </div>
    );
  }

  const m = data?.metrics || mockDashboardMetrics;
  const recentEvents = data?.events || mockSystemEvents;
  const charts = data?.charts || { advanceVolumeData, riskDistributionData, channelRecoveryData };

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
          <span className="metric-value" style={{color: 'var(--color-success)'}}>
            <LiveTicker target={m.total_recovered_today_cents} />
          </span>
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
          <AreaChart data={charts.advanceVolumeData} />
        </div>

        <div className={`card ${styles.riskCard}`}>
          <div className="section-header">
            <div>
              <p className="section-title">Borrower Risk Tiers</p>
              <p className="section-subtitle">Trust score distribution</p>
            </div>
          </div>
          <DonutChart data={charts.riskDistributionData} />
        </div>
      </div>

      {/* Channel Performance */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">Recovery Engine — Channel Performance</p>
            <p className="section-subtitle">Success rate per vending partner (80–100%)</p>
          </div>
        </div>
        <BarChart data={charts.channelRecoveryData} />
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
          {recentEvents.map((event: any) => {
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
