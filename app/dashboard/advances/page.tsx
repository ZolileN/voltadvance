'use client';
import { mockAdvances, mockBorrowers, mockMeters } from '@/lib/mock-data';
import { Advance } from '@/lib/types';
import styles from './advances.module.css';

function formatCents(c: number) {
  return `R ${(c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-amber',
    PARTIALLY_REPAID: 'badge-info',
    SETTLED: 'badge-success',
    DEFAULTED: 'badge-danger',
    BLOCKED: 'badge-danger',
  };
  return map[status] || 'badge-neutral';
}

function maskPhone(phone: string) {
  return phone.replace(/(\+\d{2})(\d{3})(\d{4})(\d{3})/, '$1***$4');
}

const advances: (Advance & { borrower_phone: string; meter_number: string })[] =
  mockAdvances.map(a => ({
    ...a,
    borrower_phone: mockBorrowers.find(b => b.id === a.borrower_id)?.phone_number || 'Unknown',
    meter_number: mockMeters.find(m => m.id === a.meter_id)?.meter_number || 'Unknown',
  }));

export default function AdvancesPage() {
  const totalOutstanding = advances.filter(a => a.status === 'ACTIVE' || a.status === 'PARTIALLY_REPAID')
    .reduce((s, a) => s + a.outstanding_cents, 0);
  const totalSettled = advances.filter(a => a.status === 'SETTLED').length;
  const totalActive = advances.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className={styles.page}>
      {/* Summary */}
      <div className={styles.summaryRow}>
        <div className="metric-card">
          <span className="metric-label">Total Active</span>
          <span className="metric-value text-amber">{totalActive}</span>
          <div className="metric-delta neutral">advances outstanding</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Exposure</span>
          <span className="metric-value">{formatCents(totalOutstanding)}</span>
          <div className="metric-delta neutral">outstanding balance</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Settled</span>
          <span className="metric-value" style={{color: 'var(--color-success)'}}>{totalSettled}</span>
          <div className="metric-delta positive">fully recovered</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">⚡ Advance Ledger</p>
            <p className="section-subtitle">{advances.length} advances total</p>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Borrower</th>
                <th>Meter</th>
                <th>Principal</th>
                <th>Fee</th>
                <th>Outstanding</th>
                <th>Repaid</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {advances.map(a => (
                <tr key={a.id}>
                  <td>
                    <span className="font-mono" style={{fontSize: 12, color: 'var(--color-amber)'}}>
                      {a.advance_reference}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{fontSize: 12}}>
                      {maskPhone(a.borrower_phone)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{fontSize: 12, color: 'var(--text-secondary)'}}>
                      {a.meter_number}
                    </span>
                  </td>
                  <td><strong>{formatCents(a.principal_cents)}</strong></td>
                  <td style={{color: 'var(--text-secondary)'}}>{formatCents(a.fee_cents)}</td>
                  <td style={{color: a.outstanding_cents > 0 ? 'var(--color-danger)' : 'var(--color-success)'}}>
                    <strong>{formatCents(a.outstanding_cents)}</strong>
                  </td>
                  <td style={{color: 'var(--color-success)'}}>{formatCents(a.repaid_cents)}</td>
                  <td>
                    <span className="badge badge-neutral">{a.issued_via || 'N/A'}</span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
                  </td>
                  <td style={{fontSize: 11, color: 'var(--text-muted)'}}>
                    {new Date(a.created_at).toLocaleDateString('en-ZA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
