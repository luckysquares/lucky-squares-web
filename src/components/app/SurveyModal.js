'use client';

import { useState, useMemo } from 'react';
import { pickRandom } from '@/lib/surveyQuestions';
import { getSupabaseClient } from '@/lib/supabase/client';

// ── Answer input components ───────────────────────────────────────────────────

function ButtonGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1.5px solid',
            borderColor: value === opt ? 'var(--purple)' : 'var(--border)',
            background: value === opt ? 'var(--purple-light)' : '#fff',
            color: value === opt ? 'var(--purple)' : 'var(--text)',
            fontWeight: value === opt ? 700 : 500,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Rating5({ labels, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          title={labels?.[n - 1] ?? String(n)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: '1.5px solid',
            borderColor: value === String(n) ? 'var(--purple)' : 'var(--border)',
            background: value === String(n) ? 'var(--purple)' : '#fff',
            color: value === String(n) ? '#fff' : 'var(--text)',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function NpsRow({ value, onChange }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(String(i))}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1.5px solid',
              borderColor: value === String(i) ? 'var(--purple)' : 'var(--border)',
              background: value === String(i) ? 'var(--purple)' : '#fff',
              color: value === String(i) ? '#fff' : 'var(--text)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
          >
            {i}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Not at all likely</span>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Extremely likely</span>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }) {
  const { type, labels } = question;

  if (type === 'rating5') {
    return <Rating5 labels={labels} value={value} onChange={onChange} />;
  }
  if (type === 'yesno') {
    return <ButtonGroup options={['Yes', 'No']} value={value} onChange={onChange} />;
  }
  if (type === 'yesno_maybe') {
    return <ButtonGroup options={labels ?? ['Yes', 'It\'s okay', 'No']} value={value} onChange={onChange} />;
  }
  if (type === 'outcome') {
    return <ButtonGroup options={labels ?? ['More than hoped', 'About what I hoped', 'Less than hoped']} value={value} onChange={onChange} />;
  }
  if (type === 'alternatives') {
    return <ButtonGroup options={labels ?? []} value={value} onChange={onChange} />;
  }
  if (type === 'nps') {
    return <NpsRow value={value} onChange={onChange} />;
  }
  if (type === 'text') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Share your thoughts..."
        rows={3}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '10px 12px',
          borderRadius: 10,
          border: '1.5px solid var(--border)',
          fontFamily: 'inherit',
          fontSize: 13,
          color: 'var(--text)',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    );
  }
  return null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function SurveyModal({ fundraiserId, ownerId, onDismiss }) {
  const [q1, q2]        = useMemo(() => pickRandom(2), []);
  const [a1, setA1]     = useState('');
  const [a2, setA2]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [thanked, setThanked] = useState(false);

  const canSubmit = a1.trim() !== '' && a2.trim() !== '';

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await getSupabaseClient().from('survey_responses').insert({
        fundraiser_id: fundraiserId,
        owner_id:      ownerId,
        q1_key:        q1.key,
        q1_answer:     a1.trim(),
        q2_key:        q2.key,
        q2_answer:     a2.trim(),
      });
    } catch (_) {
      // Non-fatal — don't block the organiser
    }
    setThanked(true);
    setSaving(false);
    setTimeout(() => onDismiss(), 1800);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,11,42,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 36px',
        maxWidth: 520, width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,.18)',
        position: 'relative',
      }}>
        {thanked ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Thanks for the feedback!</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>It really helps us improve Lucky Squares.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 6 }}>Quick feedback</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, margin: 0, lineHeight: 1.3 }}>
                Before you go, we'd love to ask a couple of quick questions:
              </h2>
            </div>

            {/* Question 1 */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: '0 0 2px' }}>
                1. {q1.text}
              </p>
              <QuestionInput question={q1} value={a1} onChange={setA1} />
            </div>

            {/* Question 2 */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: '0 0 2px' }}>
                2. {q2.text}
              </p>
              <QuestionInput question={q2} value={a2} onChange={setA2} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                className="btn btn-purple"
                onClick={handleSubmit}
                disabled={!canSubmit || saving}
                style={{ flex: 1, justifyContent: 'center', opacity: canSubmit ? 1 : 0.5 }}
              >
                {saving ? 'Saving…' : 'Submit feedback'}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                style={{ fontSize: 13, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, whiteSpace: 'nowrap' }}
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
