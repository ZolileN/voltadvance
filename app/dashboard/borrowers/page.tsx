'use client';
import { useState, useEffect } from 'react';
import { scoreTierLabel, scoreTierColor } from '@/lib/risk-engine';
import styles from './borrowers.module.css';

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function maskPhone(phone: string) {
  return phone.replace(/(\+\d{2})(\d{3})(\d{4})(\d{3})/, '$1***$4');
}

function ScoreBar({ score }: { score: number }) {
  const color = scoreTierColor(score);
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreFill} style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/borrowers');
        const json = await res.json();
        setBorrowers(json.borrowers || []);
      } catch (e) {
        console.error('Failed to load borrowers:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading && borrowers.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="pulse-dot" style={{ margin: '0 auto var(--space-4) auto', float: 'none' }} />
          <p className="section-title">Loading Borrowers Registry...</p>
        </div>
      </div>
    );
  }

  const avgScore = borrowers.length > 0 ? Math.round(borrowers.reduce((s, b) => s + b.trust_score, 0) / borrowers.length) : 70;
  const premiumCount = borrowers.filter(b => b.trust_score >= 81).length;
  const atRiskCount = borrowers.filter(b => b.trust_score <= 40).length;

  return (
    <div className={styles.page}>
      <div className={styles.summaryRow}>
        <div className="metric-card">
          <span className="metric-label">Total Borrowers</span>
          <span className="metric-value text-amber">{borrowers.length}</span>
          <div className="metric-delta neutral">registered phone identities</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Avg Trust Score</span>
          <span className="metric-value" style={{color: scoreTierColor(avgScore)}}>{avgScore}</span>
          <div className="metric-delta positive">{scoreTierLabel(avgScore)} tier average</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Premium Tier</span>
          <span className="metric-value" style={{color: 'var(--color-success)'}}>{premiumCount}</span>
          <div className="metric-delta neutral">score 81+</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">High Risk</span>
          <span className="metric-value" style={{color: 'var(--color-danger)'}}>{atRiskCount}</span>
          <div className="metric-delta negative">score ≤ 40 (declined)</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">👤 Borrower Registry</p>
            <p className="section-subtitle">Phone-based identity layer</p>
          </div>
          <span className="badge badge-live">
            <span className="pulse-dot" />
            Live feed
          </span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Phone (masked)</th>
                <th>Trust Score</th>
                <th>Tier</th>
                <th>Score Bar</th>
                <th>Active Exposure</th>
                <th>Total Repaid</th>
                <th>Advance Limit</th>
                <th>Member Since</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.map(b => {
                const limit = b.trust_score >= 81 ? 'R300' : b.trust_score >= 61 ? 'R100' : b.trust_score >= 41 ? 'R20' : '—';
                return (
                  <tr key={b.id}>
                    <td>
                      <span className="font-mono" style={{fontSize: 13}}>
                        {maskPhone(b.phone_number)}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{fontSize: 18, fontWeight: 700, color: scoreTierColor(b.trust_score)}}>
                        {b.trust_score}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: `${scoreTierColor(b.trust_score)}18`,
                        color: scoreTierColor(b.trust_score),
                        border: `1px solid ${scoreTierColor(b.trust_score)}40`,
                      }}>
                        {scoreTierLabel(b.trust_score)}
                      </span>
                    </td>
                    <td style={{minWidth: 100}}>
                      <ScoreBar score={b.trust_score} />
                    </td>
                    <td style={{color: b.total_active_exposure_cents > 0 ? 'var(--color-danger)' : 'var(--color-success)'}}>
                      {b.total_active_exposure_cents > 0 ? formatCents(b.total_active_exposure_cents) : 'Clear'}
                    </td>
                    <td style={{color: 'var(--color-success)'}}>
                      {formatCents(b.total_repaid_cents)}
                    </td>
                    <td style={{fontWeight: 700, color: 'var(--text-secondary)'}}>{limit}</td>
                    <td style={{fontSize: 11, color: 'var(--text-muted)'}}>
                      {new Date(b.created_at).toLocaleDateString('en-ZA')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
