'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

const stats = [
  { value: '96.4%', label: 'Recovery Rate' },
  { value: 'R300', label: 'Max Advance' },
  { value: '<60s', label: 'Advance Time' },
  { value: '5+', label: 'Vending Channels' },
];

const steps = [
  {
    icon: '📱',
    number: '01',
    title: 'Request via WhatsApp',
    desc: 'Customer texts "REQUEST ELECTRICITY ADVANCE" on WhatsApp. Identity is verified by phone number.',
  },
  {
    icon: '⚡',
    number: '02',
    title: 'Risk Engine Evaluates',
    desc: 'Our meter-based trust score engine evaluates repayment history, purchase frequency, and behavioral signals.',
  },
  {
    icon: '🔌',
    number: '03',
    title: 'Token Issued Instantly',
    desc: 'Approved advance generates a real electricity token. Debt is anchored to the meter — not the individual.',
  },
  {
    icon: '🔄',
    number: '04',
    title: 'Automatic Recovery',
    desc: 'Next time electricity is purchased — at any retailer, bank, or app — the advance is automatically deducted first.',
  },
];

const channels = ['Capitec', 'FNB', 'Shoprite', 'Boxer', 'Standard Bank', 'Nedbank', 'WhatsApp', 'Retail POS', 'USSD'];

const botMessages = [
  { from: 'user', text: 'REQUEST ELECTRICITY ADVANCE', time: '09:01' },
  { from: 'bot', text: '⚡ VoltAdvance\n\nHello! I found your meter: 123456789\nCurrent trust score: 85/100\n\nYou qualify for up to *R300* advance.\n\nHow much would you like?\n1️⃣ R50\n2️⃣ R100\n3️⃣ R200\n4️⃣ R300', time: '09:01' },
  { from: 'user', text: '2', time: '09:02' },
  { from: 'bot', text: '✅ Advance Approved!\n\n*Amount:* R100\n*Fee:* R10 (paid on recovery)\n*Total owed:* R110\n\nYour electricity token:\n`8842-2201-9933-1142`\n\n🔌 Repayment: automatic on next purchase\n\nStay powered. 💛', time: '09:02' },
];

function BotDemo() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleMessages < botMessages.length) {
      const isBot = botMessages[visibleMessages]?.from === 'bot';
      if (isBot) setIsTyping(true);
      const delay = isBot ? 1200 : 600;
      const timer = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(v => v + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visibleMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, isTyping]);

  return (
    <div className={styles.botPhone}>
      <div className={styles.phoneHeader}>
        <div className={styles.phoneDot} />
        <div>
          <p className={styles.phoneContact}>VoltAdvance</p>
          <p className={styles.phoneStatus}>WhatsApp Business</p>
        </div>
      </div>
      <div className={styles.phoneChat}>
        {botMessages.slice(0, visibleMessages).map((msg, i) => (
          <div key={i} className={`${styles.bubble} ${msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
            <pre className={styles.bubbleText}>{msg.text}</pre>
            <span className={styles.bubbleTime}>{msg.time}</span>
          </div>
        ))}
        {isTyping && (
          <div className={`${styles.bubble} ${styles.bubbleBot}`}>
            <span className={styles.typingIndicator}>
              <span /><span /><span />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>VoltAdvance</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How It Works</a>
            <a href="#channels">Channels</a>
            <a href="#whatsapp">WhatsApp Bot</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              Ops Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroTag}>
            <span className="badge badge-amber">
              <span className="pulse-dot" />
              Live on WhatsApp
            </span>
          </div>
          <h1 className={styles.heroTitle}>
            Emergency Electricity.<br />
            <span className="gradient-text">Repaid Automatically.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            VoltAdvance is a meter-centric utility advance and recovery network.
            Advances are anchored to the electricity meter — repayment is enforced
            automatically across every vending channel.
          </p>
          <div className={styles.heroActions}>
            <a href="https://wa.me/27000000000?text=REQUEST%20ELECTRICITY%20ADVANCE" className="btn btn-primary btn-lg" target="_blank" rel="noreferrer">
              ⚡ Get Emergency Electricity
            </a>
            <Link href="/dashboard" className="btn btn-secondary btn-lg">
              View Ops Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={styles.statsBar}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statItem}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className="badge badge-amber">How It Works</span>
            <h2>Advance lifecycle in 4 steps</h2>
            <p>From WhatsApp message to automatic repayment — fully automated, no manual collections.</p>
          </div>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <div key={step.number} className={styles.stepCard}>
                <div className={styles.stepNumber}>{step.number}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recovery Logic Explainer */}
      <section className={styles.recoverySection}>
        <div className={styles.container}>
          <div className={styles.recoveryGrid}>
            <div className={styles.recoveryText}>
              <span className="badge badge-amber">Recovery Engine</span>
              <h2>Debt follows the meter.<br />Not the person.</h2>
              <p>
                When a customer buys electricity at <strong>any channel</strong> — Capitec, FNB,
                Shoprite, Boxer — our recovery engine intercepts the purchase, deducts the
                outstanding advance, and issues the remaining value as electricity.
              </p>
              <div className={styles.recoveryExample}>
                <div className={styles.exampleRow}>
                  <span>Purchase amount</span>
                  <span className="text-amber">R500</span>
                </div>
                <div className={styles.exampleRow}>
                  <span>Outstanding advance</span>
                  <span style={{color: 'var(--color-danger)'}}>− R110</span>
                </div>
                <div className={styles.exampleDivider} />
                <div className={styles.exampleRow}>
                  <span><strong>Electricity issued</strong></span>
                  <span style={{color: 'var(--color-success)'}}><strong>R390</strong></span>
                </div>
              </div>
            </div>
            <div className={styles.recoveryVisual}>
              <div className={styles.recoveryFlow}>
                {['Customer Purchase', 'VoltAdvance Intercepts', 'Debt Deducted', 'Token Issued'].map((label, i) => (
                  <div key={i} className={styles.flowStep}>
                    <div className={styles.flowDot} />
                    <span>{label}</span>
                    {i < 3 && <div className={styles.flowLine} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section id="channels" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className="badge badge-amber">Channel Agnostic</span>
            <h2>Recovery works everywhere</h2>
            <p>One advance. Recovered from any channel — regardless of where the customer buys electricity.</p>
          </div>
          <div className={styles.channelGrid}>
            {channels.map((c) => (
              <div key={c} className={styles.channelChip}>{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp Demo */}
      <section id="whatsapp" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.whatsappGrid}>
            <div className={styles.whatsappText}>
              <span className="badge badge-amber">WhatsApp Interface</span>
              <h2>Request. Receive. Repay.<br />All on WhatsApp.</h2>
              <p>No app download. No account creation. Just WhatsApp — available to every South African with a smartphone.</p>
              <div className={styles.featureList}>
                {[
                  { emoji: '🔌', text: 'Request electricity advance' },
                  { emoji: '💳', text: 'Check balance & outstanding debt' },
                  { emoji: '📊', text: 'Check meter status (for landlords)' },
                  { emoji: '🔄', text: 'View repayment history' },
                ].map((f, i) => (
                  <div key={i} className={styles.featureItem}>
                    <span>{f.emoji}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <BotDemo />
          </div>
        </div>
      </section>

      {/* Infrastructure CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} />
            <h2 className={styles.ctaTitle}>Built as infrastructure.<br />Not a consumer app.</h2>
            <p className={styles.ctaSubtitle}>
              VoltAdvance is the utility credit layer that sits between prepaid electricity vending
              infrastructure and consumers. The electricity meter becomes a financial identity anchor.
            </p>
            <div className={styles.ctaPrinciples}>
              {[
                'Debt belongs to the meter, not the individual',
                'Recovery is automatic — no collections, no chasing',
                'Works across every vending channel',
                'Underwriting is behavior-based, not credit bureau',
              ].map((p, i) => (
                <div key={i} className={styles.principle}>
                  <span className={styles.principleCheck}>✓</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Open Operations Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>⚡</span>
              <span className={styles.logoText}>VoltAdvance</span>
            </div>
            <p className={styles.footerTagline}>Utility Liquidity Infrastructure for Africa</p>
            <p className={styles.footerCopy}>© 2026 VoltAdvance. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
