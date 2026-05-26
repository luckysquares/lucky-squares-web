'use client';

import { useState, useEffect } from 'react';
import { getQuestion } from '@/lib/surveyQuestions';

function npsLabel(score) {
  const n = Number(score);
  if (n >= 9) return { label: 'Promoter', color: '#00A96E' };
  if (n >= 7) return { label: 'Passive',  color: '#F59E0B' };
  return              { label: 'Detractor', color: '#EF4444' };
}

function AnswerCell({ qKey, answer }) {
  const q = getQuestion(qKey);
  if (!q) return <td style={tdStyle}>{answer}</td>;

  if (q.type === 'nps') {
    const { label, color } = npsLabel(answer);
    return (
      <td style={tdStyle}>
        <span style={{ fontWeight: 800, color }}>{answer}</span>
        <span style={{ fontSize: 11, color, marginLeft: 6, fontWeight: 600 }}>({label})</span>
      </td>
    );
  }
  if (q.type === 'rating5') {
    const stars = '★'.repeat(Number(answer)) + '☆'.repeat(5 - Number(answer));
    return <td style={tdStyle}><span style={{ color: '#F59E0B', letterSpacing: 2 }}>{stars}</span></td>;
  }
  return <td style={tdStyle}>{answer}</td>;
}

const thStyle = {
  padding: '10px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.5px', color: 'var(--text2)', textAlign: 'left',
  borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '12px 14px', fontSize: 13, color: 'var(--text)',
  borderBottom: '1px solid var(--border)', verticalAlign: 'top',
};

function SummaryCard({ icon, label, value, sub }) {
  return (
    <div className="scratch-card" style={{ padding: '20px 24px', minWidth: 160 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then((r) => r.json())
      .then(({ data, error: e }) => {
        if (e) { setError(e); } else { setRows(data ?? []); }
        setLoading(false);
      });
  }, []);

  // Compute NPS summary
  const npsRows = rows.flatMap((r) => {
    const answers = [];
    if (getQuestion(r.q1_key)?.type === 'nps') answers.push(Number(r.q1_answer));
    if (getQuestion(r.q2_key)?.type === 'nps') answers.push(Number(r.q2_answer));
    return answers;
  });
  const promoters  = npsRows.filter((n) => n >= 9).length;
  const detractors = npsRows.filter((n) => n <= 6).length;
  const npsScore   = npsRows.length
    ? Math.round(((promoters - detractors) / npsRows.length) * 100)
    : null;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Feedback</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32 }}>
        Post-draw survey responses — 2 questions selected at random per draw
      </p>

      {/* Summary row */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 36 }}>
          <SummaryCard icon="💬" label="Total responses" value={rows.length} />
          {npsScore !== null && (
            <SummaryCard
              icon="📊"
              label="NPS score"
              value={npsScore > 0 ? `+${npsScore}` : npsScore}
              sub={`from ${npsRows.length} NPS ${npsRows.length === 1 ? 'answer' : 'answers'}`}
            />
          )}
          {npsScore !== null && (
            <SummaryCard icon="🟢" label="Promoters" value={promoters} sub="Score 9-10" />
          )}
          {npsScore !== null && (
            <SummaryCard icon="🔴" label="Detractors" value={detractors} sub="Score 0-6" />
          )}
        </div>
      )}

      {loading && <p style={{ color: 'var(--text2)', fontSize: 14 }}>Loading…</p>}
      {error   && <p style={{ color: 'var(--red)',   fontSize: 14 }}>Error: {error}</p>}

      {!loading && rows.length === 0 && !error && (
        <div className="scratch-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <p style={{ fontSize: 15, color: 'var(--text2)' }}>No survey responses yet. They appear after organisers complete a draw.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="scratch-card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Organiser</th>
                <th style={thStyle}>Campaign</th>
                <th style={thStyle}>Question 1</th>
                <th style={thStyle}>Answer 1</th>
                <th style={thStyle}>Question 2</th>
                <th style={thStyle}>Answer 2</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const q1 = getQuestion(r.q1_key);
                const q2 = getQuestion(r.q2_key);
                const date = new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
                const name = r.profiles?.full_name || 'Unknown';
                const campaign = r.fundraisers ? `${r.fundraisers.title}${r.fundraisers.org ? ` (${r.fundraisers.org})` : ''}` : '—';
                return (
                  <tr key={r.id} style={{ transition: 'background .1s' }}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--text2)', fontSize: 12 }}>{date}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{name}</td>
                    <td style={{ ...tdStyle, maxWidth: 180 }}>{campaign}</td>
                    <td style={{ ...tdStyle, maxWidth: 220, color: 'var(--text2)', fontSize: 12 }}>{q1?.text ?? r.q1_key}</td>
                    <AnswerCell qKey={r.q1_key} answer={r.q1_answer} />
                    <td style={{ ...tdStyle, maxWidth: 220, color: 'var(--text2)', fontSize: 12 }}>{q2?.text ?? r.q2_key}</td>
                    <AnswerCell qKey={r.q2_key} answer={r.q2_answer} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
