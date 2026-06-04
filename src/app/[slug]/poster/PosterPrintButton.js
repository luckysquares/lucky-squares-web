'use client';

export default function PosterPrintButton() {
  return (
    <div className="no-print" style={{ background: '#1A1209', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
        <strong style={{ color: '#fff' }}>Poster preview</strong> — print or save as PDF
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          ← Back
        </button>
        <button
          onClick={() => {
            window.addEventListener('afterprint', () => { try { window.close(); } catch {} }, { once: true });
            window.print();
          }}
          style={{ background: '#F5C842', border: 'none', color: '#1A1209', padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          🖨 Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
