'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './dashboard.module.css';

const navItems = [
  { href: '/dashboard', icon: '▣', label: 'Overview', exact: true },
  { href: '/dashboard/advances', icon: '⚡', label: 'Advance Ledger' },
  { href: '/dashboard/meters', icon: '🔌', label: 'Meters' },
  { href: '/dashboard/borrowers', icon: '👤', label: 'Borrowers' },
  { href: '/dashboard/recovery', icon: '🔄', label: 'Recovery Engine' },
  { href: '/dashboard/events', icon: '📡', label: 'Transaction Stream' },
  { href: '/dashboard/risk', icon: '🛡', label: 'Risk & Fraud' },
  { href: '/dashboard/whatsapp', icon: '💬', label: 'WhatsApp Bot' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeaderRow}>
          <div className={styles.sidebarLogo}>
            <Link href="/dashboard" className={styles.logo} onClick={() => setSidebarOpen(false)}>
              <span className={styles.logoIcon}>⚡</span>
              <span className={styles.logoText}>VoltAdvance</span>
            </Link>
            <span className={styles.opsTag}>OPS</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navGroup}>OPERATIONS</p>
          {navItems.slice(0, 5).map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className={styles.activeBar} />}
              </Link>
            );
          })}

          <div className={styles.navDivider} />
          <p className={styles.navGroup}>MONITORING</p>
          {navItems.slice(5).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className={styles.activeBar} />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.systemStatus}>
            <span className="pulse-dot" style={{background: 'var(--color-success)'}} />
            <span>All systems operational</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Top Bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            {/* Hamburger button visible only on mobile */}
            <button className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <h1 className={styles.pageTitle}>
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.liveChip}>
              <span className="pulse-dot" />
              <span>Live</span>
            </div>
            <div className={styles.dateChip}>
              {new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            {/* Removed ← Landing button */}
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
