'use client';
import { useState, useRef, useEffect } from 'react';
import styles from './whatsapp.module.css';

interface Message {
  id: string;
  from: 'user' | 'bot';
  text: string;
  time: string;
}

const now = () => new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

type ConvState = 'IDLE' | 'AWAITING_ADVANCE_AMOUNT' | 'AWAITING_METER';

const MENU = `⚡ *VoltAdvance Bot*
_Utility Credit Infrastructure_

Please choose:
1️⃣ Request Advance
2️⃣ My Balance
3️⃣ Meter Status
4️⃣ Repayment History

Type a number or keyword.`;

const BALANCE_RESPONSE = `💳 *Your Account*

Phone: ****4567
Trust Score: *85/100* (Premium)
Active Exposure: *R110.00*
Total Repaid: *R850.00*
Advance Limit: *R300*

Outstanding advance: ADV-0001-01
Amount due: *R110.00*
_Will recover on next electricity purchase._`;

const HISTORY_RESPONSE = `📊 *Repayment History*

ADV-0003-01 · R100 → ✅ Settled (Jun 02)
ADV-0002-01 · R50  → ✅ Settled (May 15)
ADV-0001-01 · R100 → 🟡 Active (Jun 07)

Recovery Rate: *100%*
Next advance available after settlement.`;

function generateAdvanceResponse(amount: number): string {
  const fee = Math.round(amount * 0.1);
  const total = amount + fee;
  const tokens = Array.from({ length: 4 }, () =>
    Math.floor(1000 + Math.random() * 9000)
  ).join('-');
  return `✅ *Advance Approved!*

*Amount:* R${amount.toFixed(2)}
*Fee:* R${fee.toFixed(2)} _(recovered automatically)_
*Total owed:* R${total.toFixed(2)}

Your electricity token:
\`${tokens}\`

🔌 Token valid for meter: 123456789
💡 Repayment: automatic on next purchase

Stay powered. 💛`;
}

function getMeterResponse(meterNum: string): string {
  const data: Record<string, string> = {
    '123456789': `🔌 *Meter Status: 123456789*

Provider: City Power
Status: ✅ Active
Outstanding: R110.00
Borrower: ****4567
Last activity: 1 day ago
Risk level: Low`,
    '777300400': `🔌 *Meter Status: 777300400*

Provider: Eskom
Status: ⚠️ FLAGGED
Outstanding: R100.00
Borrower: ****1111
Last activity: 8 days ago
Risk level: 🔴 HIGH

Multiple phone numbers detected.`,
  };
  return data[meterNum] || `🔌 *Meter: ${meterNum}*

Status: Not found in registry.
Please check the meter number and try again.`;
}

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', from: 'bot', text: MENU, time: now() },
  ]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<ConvState>('IDLE');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function addMessage(msg: Omit<Message, 'id'>) {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  }

  function botReply(text: string, delay = 1200) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({ from: 'bot', text, time: now() });
    }, delay);
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    addMessage({ from: 'user', text: trimmed, time: now() });
    processInput(trimmed);
  }

  function processInput(text: string) {
    const normalized = text.toLowerCase().trim();

    // Menu navigation
    if (state === 'IDLE') {
      if (['1', 'request advance', 'advance', 'request electricity advance'].includes(normalized)) {
        botReply(`📋 *Advance Request*

Your meter: 123456789
Trust Score: 85/100 ✅

How much would you like?

1️⃣ R50
2️⃣ R100
3️⃣ R200
4️⃣ R300 (max)

Type the number or amount:`);
        setState('AWAITING_ADVANCE_AMOUNT');
        return;
      }

      if (['2', 'my balance', 'balance'].includes(normalized)) {
        botReply(BALANCE_RESPONSE);
        return;
      }

      if (['3', 'meter status', 'check meter'].some(k => normalized.includes(k))) {
        if (normalized.includes('check meter ') || /\d{9}/.test(normalized)) {
          const meter = normalized.match(/\d{9}/)?.[0] || '123456789';
          botReply(getMeterResponse(meter));
          return;
        }
        botReply('🔌 *Meter Lookup*\n\nPlease enter your meter number:\n_(e.g. CHECK METER 123456789)_');
        setState('AWAITING_METER');
        return;
      }

      if (['4', 'repayment history', 'history'].includes(normalized)) {
        botReply(HISTORY_RESPONSE);
        return;
      }

      botReply(`Sorry, I didn't understand that. 🤔\n\n${MENU}`);
      return;
    }

    if (state === 'AWAITING_ADVANCE_AMOUNT') {
      const amountMap: Record<string, number> = { '1': 50, '2': 100, '3': 200, '4': 300 };
      let amount = amountMap[normalized];
      if (!amount) {
        const parsed = parseFloat(normalized.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
          amount = parsed;
        }
      }
      if (amount) {
        botReply(generateAdvanceResponse(amount), 1500);
        setState('IDLE');
      } else {
        botReply('Please choose 1–4 or type an amount between R20 and R300.');
      }
      return;
    }

    if (state === 'AWAITING_METER') {
      const meter = normalized.match(/\d{6,9}/)?.[0] || normalized;
      botReply(getMeterResponse(meter));
      setState('IDLE');
      return;
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function quickSend(text: string) {
    setInput('');
    addMessage({ from: 'user', text, time: now() });
    processInput(text);
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Info Panel */}
        <div className={styles.infoPanel}>
          <div className="card">
            <p className="section-title" style={{ marginBottom: 'var(--space-4)' }}>💬 WhatsApp Bot</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              This is the simulated VoltAdvance WhatsApp interface. All external users — customers and landlords — interact entirely through this bot.
            </p>
            <div className="divider" />
            <p className={styles.infoLabel}>SUPPORTED COMMANDS</p>
            {[
              { cmd: '1 or REQUEST ADVANCE', desc: 'Request electricity advance' },
              { cmd: '2 or MY BALANCE', desc: 'Check outstanding balance' },
              { cmd: 'CHECK METER [number]', desc: 'Query meter obligation status' },
              { cmd: '4 or HISTORY', desc: 'View repayment history' },
            ].map(item => (
              <div key={item.cmd} className={styles.commandRow} onClick={() => quickSend(item.cmd.split(' or ')[0])}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-amber)' }}>{item.cmd}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</span>
              </div>
            ))}
            <div className="divider" />
            <p className={styles.infoLabel}>TWILIO CONFIG</p>
            <div className={styles.twilioStatus}>
              <span className="badge badge-warning">⚠ Simulation Mode</span>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
                Real Twilio integration: configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local
              </p>
            </div>
          </div>
        </div>

        {/* Phone Frame */}
        <div className={styles.phoneWrap}>
          <div className={styles.phone}>
            {/* Status bar */}
            <div className={styles.statusBar}>
              <span>{new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>📶 🔋</span>
            </div>

            {/* WhatsApp Header */}
            <div className={styles.waHeader}>
              <div className={styles.waAvatar}>⚡</div>
              <div>
                <p className={styles.waName}>VoltAdvance</p>
                <p className={styles.waStatus}>WhatsApp Business · Online</p>
              </div>
            </div>

            {/* Chat */}
            <div className={styles.chat}>
              <div className={styles.dateLabel}>Today</div>
              {messages.map((msg) => (
                <div key={msg.id} className={`${styles.bubble} ${msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                  <pre className={styles.bubbleText}>{msg.text}</pre>
                  <span className={styles.bubbleTime}>{msg.time} {msg.from === 'user' && '✓✓'}</span>
                </div>
              ))}
              {isTyping && (
                <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                  <span className={styles.typing}>
                    <span /><span /><span />
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={styles.inputRow}>
              <input
                id="whatsapp-input"
                className={styles.chatInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Message"
              />
              <button
                id="whatsapp-send"
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim()}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
