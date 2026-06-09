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

const SIMULATED_PHONES = [
  { label: 'Registered Borrower (+27820001111)', value: '+27820001111' },
  { label: 'Registered Borrower (+27720002222)', value: '+27720002222' },
  { label: 'Unregistered Customer #1 (+27610003333)', value: '+27610003333' },
  { label: 'Unregistered Customer #2 (+27999998888)', value: '+27999998888' },
];

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('+27820001111');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Trigger welcome flow when phone number changes or on initial load
  useEffect(() => {
    setMessages([]);
    setIsTyping(true);

    async function triggerWelcome() {
      try {
        const response = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            From: `whatsapp:${selectedPhone}`,
            Body: 'hello'
          })
        });
        const xml = await response.text();
        const match = xml.match(/<Message>([\s\S]*?)<\/Message>/);
        const rawText = match ? match[1] : 'Welcome to VoltAdvance! Type any message to start.';
        const cleanText = rawText
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        setIsTyping(false);
        setMessages([
          { id: `init-${Date.now()}`, from: 'bot', text: cleanText, time: now() }
        ]);
      } catch (e) {
        console.error('Failed to connect to WhatsApp API:', e);
        setIsTyping(false);
        setMessages([
          { id: `init-err`, from: 'bot', text: 'Error connecting to VoltAdvance clearing engine.', time: now() }
        ]);
      }
    }

    triggerWelcome();
  }, [selectedPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function addMessage(msg: Omit<Message, 'id'>) {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    addMessage({ from: 'user', text: trimmed, time: now() });
    
    setIsTyping(true);
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: `whatsapp:${selectedPhone}`,
          Body: trimmed
        })
      });
      const xml = await response.text();
      const match = xml.match(/<Message>([\s\S]*?)<\/Message>/);
      const rawText = match ? match[1] : 'Sorry, could not communicate with bot.';
      const cleanText = rawText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      setIsTyping(false);
      addMessage({ from: 'bot', text: cleanText, time: now() });
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      addMessage({ from: 'bot', text: 'Error connecting to VoltAdvance clearing engine.', time: now() });
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
    
    // Call processInput inline
    setIsTyping(true);
    fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: `whatsapp:${selectedPhone}`,
        Body: text
      })
    })
      .then(res => res.text())
      .then(xml => {
        const match = xml.match(/<Message>([\s\S]*?)<\/Message>/);
        const rawText = match ? match[1] : 'Sorry, could not communicate with bot.';
        const cleanText = rawText
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        setIsTyping(false);
        addMessage({ from: 'bot', text: cleanText, time: now() });
      })
      .catch(e => {
        console.error(e);
        setIsTyping(false);
        addMessage({ from: 'bot', text: 'Error connecting to VoltAdvance clearing engine.', time: now() });
      });
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Info Panel */}
        <div className={styles.infoPanel}>
          <div className="card">
            <p className="section-title" style={{ marginBottom: 'var(--space-4)' }}>💬 WhatsApp Bot Simulator</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              All external users — customers and landlords — interact entirely through this interface. Purchases trigger the integrated credit clearing engine.
            </p>
            
            <div className="divider" />
            
            <p className={styles.infoLabel}>SIMULATED SENDER (IDENTITY)</p>
            <select
              id="sender-select"
              value={selectedPhone}
              onChange={e => setSelectedPhone(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                marginBottom: 'var(--space-4)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {SIMULATED_PHONES.map(p => (
                <option key={p.value} value={p.value} style={{ background: '#1e1e24' }}>
                  {p.label}
                </option>
              ))}
            </select>

            <div className="divider" />

            <p className={styles.infoLabel}>QUICK COMMANDS</p>
            {[
              { cmd: '1', desc: 'Buy electricity & clear debt' },
              { cmd: '2', desc: 'Request emergency credit' },
              { cmd: '3', desc: 'Check outstanding balances' },
              { cmd: '4', desc: 'Check meter status & history' },
            ].map(item => (
              <div key={item.cmd} className={styles.commandRow} onClick={() => quickSend(item.cmd)}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-amber)' }}>Option {item.cmd}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</span>
              </div>
            ))}
            
            <div className="divider" />
            
            <p className={styles.infoLabel}>TWILIO CONFIG</p>
            <div className={styles.twilioStatus}>
              <span className="badge badge-success">✓ Active webhook /api/whatsapp</span>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
                Your live Twilio numbers link directly to this state machine. Standard recharges instantly settle outstanding emergency credit.
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
