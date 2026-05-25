'use client';

import { useState } from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import Link from 'next/link';
import { FAQS } from './faq-data';

function Accordion({ question, answer, link }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>{question}</span>
        <span style={{ fontSize: 20, color: 'var(--green)', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 18, fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>{answer}</p>
          {link && (
            <Link href={link.href} style={{ display: 'inline-block', marginTop: 10, color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>
              {link.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <>
      <MarketingNav />

      <section className="section section-hero-bg" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Help</div>
          <h1 className="section-heading" style={{ margin: '0 auto 16px' }}>Frequently Asked Questions</h1>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Everything you need to know about running or participating in a Lucky Squares fundraiser.
          </p>
        </div>
      </section>

      <section className="section section-solid-bg" style={{ paddingTop: 0 }}>
        <div className="section-inner" style={{ maxWidth: 780 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {FAQS.map((section) => (
              <div key={section.category} style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '28px 36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>{section.emoji}</span>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                    {section.category}
                  </h2>
                </div>
                <div>
                  {section.items.map((item) => (
                    <Accordion key={item.q} question={item.q} answer={item.a} link={item.link} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', padding: '32px 36px', marginTop: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Still have questions?</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.7 }}>
              Our team is happy to help. Reach out and we will get back to you within one business day.
            </p>
            <Link href="/contact" className="btn btn-primary">Contact us →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
