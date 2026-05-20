'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient, supabaseConfigured } from '@/lib/supabase/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const FIXED_COSTS = 600;
const PRICE_INDIVIDUAL = 19;
const PRICE_ORG_ANNUAL = 149;
const PRICE_BLITZ = 99;
const TAM = 15000;

const DEFAULTS = {
  indivLeads: 50,
  orgLeads: 20,
  indivConvRate: 0.15,
  orgConvRate: 0.10,
  organicNewPerMonth: 2,
  referralCoeff: 0.08,
  campaignsPerIndiv: 2.5,
  campaignsPerOrg: 6,
  upgradeRate: 0.05,
  blitzAdoption: 0.50,
  seasonal: [0.9, 0.85, 1.1, 1.2, 1.0, 0.8, 0.75, 0.9, 1.1, 1.2, 1.1, 0.85],
};

const SCENARIO_MULT = { conservative: 0.70, base: 1.0, optimistic: 1.40 };
const STORAGE_KEY = 'ls_forecast_assumptions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const aud = (n) => `$${Math.round(n).toLocaleString('en-AU')}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

function monthLabel(offset) {
  const d = new Date(2026, 4 + offset); // May 2026 = month 0
  return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
}

function monthKey(offset) {
  const d = new Date(2026, 4 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Month 0 = May 2026 (current)
const CURRENT_MONTH_IDX = 0;

// ─── Model ────────────────────────────────────────────────────────────────────

function buildModel(assumptions, scenario, actualData) {
  const mult = SCENARIO_MULT[scenario];
  const {
    indivLeads, orgLeads, indivConvRate, orgConvRate,
    organicNewPerMonth, referralCoeff, campaignsPerIndiv,
    campaignsPerOrg, upgradeRate, blitzAdoption, seasonal,
  } = assumptions;

  const months = [];
  let indivPool = indivLeads;
  let orgPool = orgLeads;
  let cumulativeIndiv = 0; // total individual organisers on platform
  let cumulativeOrgs = 0;  // total org clients

  // 5-year monthly model (60 months)
  for (let i = 0; i < 60; i++) {
    const calMonth = (4 + i) % 12; // 0=Jan..11=Dec, i=0 => May (4)
    const sw = seasonal[calMonth];
    const isProjected = i >= (actualData?.months?.length ?? 0);

    // New conversions from pool
    const newIndivFromPool = Math.min(indivPool, Math.round(indivPool * indivConvRate * mult));
    const newOrgFromPool   = Math.min(orgPool, Math.round(orgPool * orgConvRate * mult));

    // Organic / referral growth
    const referralNew = Math.round(cumulativeIndiv * referralCoeff * mult);
    const organic     = Math.round(organicNewPerMonth * mult * (1 + i * 0.02));
    const newIndivOrganic = referralNew + organic;

    const totalNewIndiv = newIndivFromPool + newIndivOrganic;
    const totalNewOrg   = newOrgFromPool;

    // Upgrades from individual to org
    const upgrades = Math.round(cumulativeIndiv * (upgradeRate / 12));

    // Update pools and bases
    indivPool      = Math.max(0, indivPool - newIndivFromPool);
    orgPool        = Math.max(0, orgPool - newOrgFromPool);
    cumulativeIndiv = cumulativeIndiv + totalNewIndiv - upgrades;
    cumulativeOrgs  = cumulativeOrgs + totalNewOrg + upgrades;

    // Revenue calcs
    const campaignRevIndiv = Math.round(
      cumulativeIndiv * (campaignsPerIndiv / 12) * PRICE_INDIVIDUAL * sw * mult
    );
    const orgPlanRev = Math.round(cumulativeOrgs * (PRICE_ORG_ANNUAL / 12));
    const campaignRevOrg = Math.round(
      cumulativeOrgs * (campaignsPerOrg / 12) * PRICE_INDIVIDUAL * sw * mult
    );
    // Blitz from month 3 onwards
    const blitzRev = i >= 2
      ? Math.round(cumulativeOrgs * blitzAdoption * (1 / 12) * PRICE_BLITZ * sw * mult)
      : 0;

    const gross = campaignRevIndiv + orgPlanRev + campaignRevOrg + blitzRev;
    const net   = gross - FIXED_COSTS;

    // Check for actual data override
    const key = monthKey(i);
    const actual = actualData?.byMonth?.[key];

    months.push({
      idx: i,
      label: monthLabel(i),
      key,
      isProjected,
      isCurrent: i === CURRENT_MONTH_IDX,
      newIndiv: actual?.newIndiv ?? totalNewIndiv,
      newOrg:   actual?.newOrg ?? totalNewOrg,
      cumulativeIndiv,
      cumulativeOrgs,
      campaignRevIndiv,
      orgPlanRev,
      campaignRevOrg,
      blitzRev,
      gross: actual?.gross ?? gross,
      net:   actual?.net ?? net,
      sw,
      actualGross: actual?.gross,
    });
  }

  return months;
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ months, height = 180 }) {
  const W = 760;
  const PL = 56, PR = 16, PT = 12, PB = 30;
  const chartW = W - PL - PR;
  const chartH = height - PT - PB;

  const maxVal = Math.max(...months.map((m) => m.gross), 1);
  const barW = Math.floor(chartW / months.length) - 2;

  const yTicks = 4;
  const tickStep = Math.ceil(maxVal / yTicks / 500) * 500;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: height, display: 'block' }}>
      {/* Y grid lines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = i * tickStep;
        const y = PT + chartH - (v / (tickStep * yTicks)) * chartH;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#E5E0D5" strokeWidth={1} />
            <text x={PL - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#9B8F80">
              {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {months.map((m, i) => {
        const x = PL + i * (chartW / months.length) + 1;
        const grossH = Math.max(1, (m.gross / (tickStep * yTicks)) * chartH);
        const y = PT + chartH - grossH;
        const isActual = !m.isProjected;
        const isCur = m.isCurrent;

        return (
          <g key={m.key}>
            <rect
              x={x} y={y} width={barW} height={grossH}
              fill={isActual ? '#16A34A' : isCur ? '#4ADE80' : '#BBF7D0'}
              rx={2}
              opacity={isCur ? 1 : 0.9}
            />
            {/* Actual vs projected overlay */}
            {m.actualGross && m.isProjected && (
              <rect
                x={x} y={PT + chartH - Math.max(1, (m.actualGross / (tickStep * yTicks)) * chartH)}
                width={barW}
                height={Math.max(1, (m.actualGross / (tickStep * yTicks)) * chartH)}
                fill="#16A34A" rx={2}
              />
            )}
            {/* Month label */}
            {i % 3 === 0 && (
              <text x={x + barW / 2} y={height - 4} textAnchor="middle" fontSize={8.5} fill="#9B8F80">
                {m.label}
              </text>
            )}
            {isCur && (
              <rect x={x - 1} y={y - 2} width={barW + 2} height={grossH + 4} fill="none"
                stroke="#16A34A" strokeWidth={1.5} rx={3} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Stacked Bar Chart (5-year) ──────────────────────────────────────────

function StackedBarChart({ years, height = 200 }) {
  const W = 760;
  const PL = 60, PR = 20, PT = 16, PB = 40;
  const chartW = W - PL - PR;
  const chartH = height - PT - PB;
  const maxVal = Math.max(...years.map((y) => y.total), 1);
  const barW = Math.floor(chartW / years.length) - 8;

  // Cumulative line
  let cumulative = 0;
  const cumPoints = years.map((y, i) => {
    cumulative += y.total;
    const x = PL + i * (chartW / years.length) + barW / 2;
    const yv = PT + chartH - (cumulative / (maxVal * years.length)) * chartH;
    return { x, y: Math.max(PT, yv), cum: cumulative };
  });

  const linePath = cumPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const tickStep = Math.ceil(maxVal / 4 / 5000) * 5000;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: height, display: 'block' }}>
      {/* Y grid */}
      {Array.from({ length: 5 }, (_, i) => {
        const v = i * tickStep;
        const y = PT + chartH - (v / (tickStep * 4)) * chartH;
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#E5E0D5" strokeWidth={1} />
            <text x={PL - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#9B8F80">
              {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            </text>
          </g>
        );
      })}

      {/* Stacked bars */}
      {years.map((yr, i) => {
        const x = PL + i * (chartW / years.length) + 2;
        const scale = chartH / (tickStep * 4);
        const h1 = Math.max(1, yr.indivCampaigns * scale);
        const h2 = Math.max(1, yr.orgPlans * scale);
        const h3 = Math.max(1, yr.blitz * scale);
        const h4 = Math.max(1, yr.orgCampaigns * scale);
        let cy = PT + chartH;

        const segments = [
          { h: h1, fill: '#16A34A' },
          { h: h2, fill: '#7C3AED' },
          { h: h3, fill: '#F59E0B' },
          { h: h4, fill: '#34D399' },
        ];

        return (
          <g key={yr.year}>
            {segments.map((seg, si) => {
              cy -= seg.h;
              return <rect key={si} x={x} y={cy} width={barW} height={seg.h} fill={seg.fill} opacity={0.85} rx={si === 0 ? 2 : 0} />;
            })}
            <text x={x + barW / 2} y={height - 22} textAnchor="middle" fontSize={10} fontWeight={700} fill="#6B5E4E">
              {yr.year}
            </text>
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={8.5} fill="#9B8F80">
              {aud(yr.total)}
            </text>
          </g>
        );
      })}

      {/* Cumulative line */}
      <path d={linePath} fill="none" stroke="#DC2626" strokeWidth={2} strokeDasharray="4 2" />
      {cumPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#DC2626" />
      ))}

      {/* Legend */}
      {[
        { fill: '#16A34A', label: 'Indiv campaigns' },
        { fill: '#7C3AED', label: 'Org plans' },
        { fill: '#F59E0B', label: 'Blitz events' },
        { fill: '#34D399', label: 'Org campaigns' },
        { fill: '#DC2626', label: 'Cumulative' },
      ].map((leg, i) => (
        <g key={i} transform={`translate(${PL + i * 140}, ${height - 2})`}>
          <rect x={0} y={-10} width={10} height={10}
            fill={leg.fill} rx={2}
            strokeDasharray={leg.fill === '#DC2626' ? '3 2' : undefined}
          />
          <text x={14} y={-1} fontSize={8.5} fill="#6B5E4E">{leg.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#16A34A' }}
      />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1.5px solid #E5E0D5',
      boxShadow: '0 2px 12px rgba(61,46,26,0.07)',
      padding: '24px 28px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#9B8F80',
      marginBottom: 18,
    }}>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminReporting() {
  const [activeTab, setActiveTab] = useState('forecasting');
  const [assumptions, setAssumptions] = useState(DEFAULTS);
  const [scenario, setScenario] = useState('base');
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [actualData, setActualData] = useState(null);
  const [loading, setLoading] = useState(true);
  const monthScrollRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAssumptions({ ...DEFAULTS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assumptions));
    } catch {}
  }, [assumptions]);

  // Pull actual data from Supabase
  useEffect(() => {
    const load = async () => {
      if (!supabaseConfigured) { setLoading(false); return; }
      try {
        const sb = getSupabaseClient();
        const [{ data: fundraisers }, { data: profiles }] = await Promise.all([
          sb.from('fundraisers').select('created_at, status'),
          sb.from('profiles').select('created_at, role'),
        ]);

        const byMonth = {};
        (fundraisers ?? []).forEach((f) => {
          const key = f.created_at?.slice(0, 7);
          if (!key) return;
          if (!byMonth[key]) byMonth[key] = { campaigns: 0, newIndiv: 0, newOrg: 0 };
          byMonth[key].campaigns++;
        });
        (profiles ?? []).forEach((p) => {
          const key = p.created_at?.slice(0, 7);
          if (!key) return;
          if (!byMonth[key]) byMonth[key] = { campaigns: 0, newIndiv: 0, newOrg: 0 };
          if (p.role === 'org') byMonth[key].newOrg = (byMonth[key].newOrg || 0) + 1;
          else byMonth[key].newIndiv = (byMonth[key].newIndiv || 0) + 1;
        });

        // Estimate gross from campaigns
        Object.keys(byMonth).forEach((key) => {
          byMonth[key].gross = (byMonth[key].campaigns || 0) * PRICE_INDIVIDUAL;
          byMonth[key].net = byMonth[key].gross - FIXED_COSTS;
        });

        setActualData({ byMonth, months: Object.keys(byMonth).sort() });
      } catch (e) {
        console.warn('Supabase fetch error', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateAssumption = useCallback((key, val) => {
    setAssumptions((prev) => ({ ...prev, [key]: val }));
  }, []);

  const resetDefaults = useCallback(() => {
    setAssumptions(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // Build model
  const allMonths = buildModel(assumptions, scenario, actualData);
  const months12 = allMonths.slice(0, 12);

  // 12-month summary
  const total12Rev = months12.reduce((s, m) => s + m.gross, 0);
  const breakEvenMonth = allMonths.findIndex((m) => m.net > 0);

  // Year-3 ARR: average last 3 months of year 3 (months 33-35)
  const yr3Months = allMonths.slice(33, 36);
  const yr3ARR = yr3Months.length > 0
    ? (yr3Months.reduce((s, m) => s + m.gross, 0) / yr3Months.length) * 12
    : 0;

  // Current month actuals vs forecast
  const curMonth = months12[0];

  // 5-year annual rollups
  const years5 = Array.from({ length: 5 }, (_, yi) => {
    const slice = allMonths.slice(yi * 12, yi * 12 + 12);
    const year = 2026 + yi;
    return {
      year,
      total: slice.reduce((s, m) => s + m.gross, 0),
      indivCampaigns: slice.reduce((s, m) => s + m.campaignRevIndiv, 0),
      orgPlans: slice.reduce((s, m) => s + m.orgPlanRev, 0),
      blitz: slice.reduce((s, m) => s + m.blitzRev, 0),
      orgCampaigns: slice.reduce((s, m) => s + m.campaignRevOrg, 0),
    };
  });

  const yr5Total = years5.reduce((s, y) => s + y.total, 0);
  const yr5Penetration = (allMonths[59]?.cumulativeOrgs / TAM) * 100;

  // LTV calculations
  const ltvIndiv = ((assumptions.campaignsPerIndiv * PRICE_INDIVIDUAL * 2.5)); // ~2.5yr avg tenure
  const ltvOrg   = PRICE_ORG_ANNUAL * 3 + assumptions.campaignsPerOrg * PRICE_INDIVIDUAL * 3 + PRICE_BLITZ * 3;

  // Selected month detail
  const sel = months12[selectedMonth] ?? allMonths[selectedMonth];

  // Scroll current month into view
  useEffect(() => {
    if (monthScrollRef.current) {
      const btn = monthScrollRef.current.querySelector('[data-current="true"]');
      if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Page header */}
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
        Reporting and Forecasting
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
        Platform analytics, campaign reporting and revenue forecasting
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '2px solid #E5E0D5' }}>
        {[
          { key: 'reporting',    label: 'Reporting'    },
          { key: 'forecasting',  label: 'Forecasting'  },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 14, fontWeight: 800,
              fontFamily: 'inherit',
              color: activeTab === key ? '#7C3AED' : 'var(--text2)',
              borderBottom: activeTab === key ? '2px solid #7C3AED' : '2px solid transparent',
              marginBottom: -2,
              transition: 'all .15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Reporting tab — placeholder */}
      {activeTab === 'reporting' && (
        <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>
            Campaign Reporting
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
            Detailed campaign performance reporting is coming soon. This will cover squares sold, revenue per campaign, organiser activity, draw outcomes and buyer trends.
          </p>
        </div>
      )}

      {/* Forecasting tab */}
      {activeTab === 'forecasting' && <>
      {loading && (
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
          Loading actuals from Supabase...
        </div>
      )}

      {/* Scenario toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {['conservative', 'base', 'optimistic'].map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            style={{
              padding: '8px 20px',
              borderRadius: 24,
              border: '1.5px solid',
              borderColor: scenario === s ? '#16A34A' : '#E5E0D5',
              background: scenario === s ? '#16A34A' : '#fff',
              color: scenario === s ? '#fff' : '#6B5E4E',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s === 'conservative' ? 'Conservative (70%)' : s === 'optimistic' ? 'Optimistic (140%)' : 'Base'}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text2)', alignSelf: 'center', marginLeft: 8 }}>
          {scenario === 'conservative' ? '70% of base assumptions'
            : scenario === 'optimistic' ? '140% of base assumptions'
            : 'Base assumptions as configured'}
        </span>
      </div>

      {/* ── 1. Overview panel ─────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle>Overview</SectionTitle>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8F80', marginBottom: 8 }}>
            12-Month Revenue
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 900, color: '#16A34A' }}>
            {aud(total12Rev)}
          </div>
          <div style={{ fontSize: 12, color: '#9B8F80', marginTop: 4 }}>Projected gross</div>
        </Card>

        <Card style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8F80', marginBottom: 8 }}>
            Year-3 ARR
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 900, color: '#7C3AED' }}>
            {aud(yr3ARR)}
          </div>
          <div style={{ fontSize: 12, color: '#9B8F80', marginTop: 4 }}>Annualised run rate</div>
        </Card>

        <Card style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8F80', marginBottom: 8 }}>
            Break-Even Month
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 900, color: breakEvenMonth < 0 ? '#DC2626' : '#16A34A' }}>
            {breakEvenMonth < 0 ? 'N/A' : monthLabel(breakEvenMonth)}
          </div>
          <div style={{ fontSize: 12, color: '#9B8F80', marginTop: 4 }}>
            {breakEvenMonth < 0 ? 'Not within 5 years' : `Month ${breakEvenMonth + 1}`}
          </div>
        </Card>

        <Card style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8F80', marginBottom: 8 }}>
            This Month
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 900, color: curMonth?.gross >= FIXED_COSTS ? '#16A34A' : '#F59E0B' }}>
            {aud(curMonth?.actualGross ?? curMonth?.gross ?? 0)}
          </div>
          <div style={{ fontSize: 12, color: '#9B8F80', marginTop: 4 }}>
            {curMonth?.actualGross ? 'Actual' : 'Projected'} — {curMonth?.label}
          </div>
        </Card>
      </div>

      {/* 12-month bar chart */}
      <Card style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>12-Month Revenue Forecast</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, background: '#16A34A', borderRadius: 2, display: 'inline-block' }} />
              Actual
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, background: '#BBF7D0', borderRadius: 2, display: 'inline-block' }} />
              Projected
            </span>
          </div>
        </div>
        <BarChart months={months12} height={200} />
        <div style={{ fontSize: 12, color: '#9B8F80', marginTop: 12 }}>
          Fixed costs {aud(FIXED_COSTS)}/month. Green outline = current month.
        </div>
      </Card>

      {/* ── 2. Monthly drilldown ──────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle>Monthly Drilldown</SectionTitle>
      </div>

      {/* Month selector */}
      <div
        ref={monthScrollRef}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20, scrollbarWidth: 'thin' }}
      >
        {allMonths.slice(0, 18).map((m, i) => (
          <button
            key={m.key}
            data-current={m.isCurrent ? 'true' : 'false'}
            onClick={() => setSelectedMonth(i)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: '1.5px solid',
              borderColor: selectedMonth === i ? '#16A34A' : m.isCurrent ? '#86EFAC' : '#E5E0D5',
              background: selectedMonth === i ? '#16A34A' : m.isCurrent ? '#F0FBF6' : '#fff',
              color: selectedMonth === i ? '#fff' : '#6B5E4E',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {m.label}
            {m.isCurrent && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>(now)</span>}
          </button>
        ))}
      </div>

      {/* Month detail card */}
      {sel && (
        <Card style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900 }}>{sel.label}</div>
              <div style={{ fontSize: 12, color: '#9B8F80', marginTop: 4 }}>
                {sel.isProjected ? 'Projected figures' : 'Actual figures'}
                {sel.isCurrent && ' (current month)'}
              </div>
            </div>
            <div style={{
              background: sel.net >= 0 ? '#F0FBF6' : '#FFF5F5',
              border: `1.5px solid ${sel.net >= 0 ? '#86EFAC' : '#FECACA'}`,
              borderRadius: 12,
              padding: '12px 20px',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Net Margin</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, color: sel.net >= 0 ? '#16A34A' : '#DC2626' }}>
                {aud(sel.net)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            {[
              { label: 'New Individual Organisers', value: sel.newIndiv, color: '#16A34A' },
              { label: 'New Org Clients', value: sel.newOrg, color: '#7C3AED' },
              { label: 'Cumulative Organisers', value: sel.cumulativeIndiv, color: '#6B5E4E' },
              { label: 'Cumulative Orgs', value: sel.cumulativeOrgs, color: '#6B5E4E' },
              { label: 'Gross Revenue', value: aud(sel.gross), color: '#16A34A' },
              { label: 'Fixed Costs', value: aud(FIXED_COSTS), color: '#9B8F80' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '14px 16px', background: '#F9F8F6', borderRadius: 12, border: '1px solid #E5E0D5' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9B8F80', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E5E0D5' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Revenue Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Individual campaign fees', value: sel.campaignRevIndiv, color: '#16A34A' },
                { label: 'Org plan subscriptions (monthly share)', value: sel.orgPlanRev, color: '#7C3AED' },
                { label: 'Org campaign fees', value: sel.campaignRevOrg, color: '#34D399' },
                { label: 'Blitz event fees', value: sel.blitzRev, color: '#F59E0B' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: row.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 13, color: '#6B5E4E' }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: row.value > 0 ? row.color : '#C4B9AA' }}>{aud(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actuals vs forecast side by side for past months */}
          {!sel.isProjected && sel.actualGross !== undefined && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E5E0D5' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Actuals vs Forecast
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '14px 16px', background: '#F0FBF6', borderRadius: 12, border: '1px solid #86EFAC' }}>
                  <div style={{ fontSize: 11, color: '#9B8F80', fontWeight: 700, marginBottom: 4 }}>Actual</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#16A34A' }}>{aud(sel.actualGross)}</div>
                </div>
                <div style={{ padding: '14px 16px', background: '#F9F8F6', borderRadius: 12, border: '1px solid #E5E0D5' }}>
                  <div style={{ fontSize: 11, color: '#9B8F80', fontWeight: 700, marginBottom: 4 }}>Model Projection</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#6B5E4E' }}>{aud(sel.gross)}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── 3. 5-year annual view ─────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle>5-Year Annual View</SectionTitle>
      </div>

      <Card style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Revenue by Stream (2026-2030)</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9B8F80', flexWrap: 'wrap' }}>
            <span>5-year total: <strong style={{ color: '#16A34A' }}>{aud(yr5Total)}</strong></span>
            <span>Yr-5 org penetration: <strong style={{ color: '#7C3AED' }}>{yr5Penetration.toFixed(2)}%</strong> of {TAM.toLocaleString('en-AU')} TAM</span>
          </div>
        </div>
        <StackedBarChart years={years5} height={240} />

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {years5.map((yr) => (
            <div key={yr.year} style={{ padding: '12px 16px', background: '#F9F8F6', borderRadius: 10, border: '1px solid #E5E0D5' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#6B5E4E', marginBottom: 4 }}>{yr.year}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#16A34A' }}>{aud(yr.total)}</div>
              <div style={{ fontSize: 11, color: '#9B8F80', marginTop: 2 }}>
                {pct(yr.total / (TAM * PRICE_ORG_ANNUAL))} of TAM value
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 4. Assumptions panel ─────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle>Model Assumptions</SectionTitle>
      </div>

      <Card style={{ marginBottom: 32 }}>
        <button
          onClick={() => setAssumptionsOpen((v) => !v)}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>
            {assumptionsOpen ? 'Hide' : 'Show'} assumption sliders
          </span>
          <span style={{ fontSize: 20, color: '#9B8F80' }}>{assumptionsOpen ? '▲' : '▼'}</span>
        </button>

        {assumptionsOpen && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Pipeline</div>
                <Slider label="Individual organiser leads" value={assumptions.indivLeads} min={0} max={500} step={5} format={(v) => v} onChange={(v) => updateAssumption('indivLeads', v)} />
                <Slider label="Organisation leads" value={assumptions.orgLeads} min={0} max={200} step={1} format={(v) => v} onChange={(v) => updateAssumption('orgLeads', v)} />
                <Slider label="Individual conversion rate/month" value={assumptions.indivConvRate} min={0.01} max={0.5} step={0.01} format={pct} onChange={(v) => updateAssumption('indivConvRate', v)} />
                <Slider label="Org conversion rate/month" value={assumptions.orgConvRate} min={0.01} max={0.4} step={0.01} format={pct} onChange={(v) => updateAssumption('orgConvRate', v)} />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Growth</div>
                <Slider label="Organic new organisers/month" value={assumptions.organicNewPerMonth} min={0} max={20} step={0.5} format={(v) => v} onChange={(v) => updateAssumption('organicNewPerMonth', v)} />
                <Slider label="Referral coefficient" value={assumptions.referralCoeff} min={0} max={0.3} step={0.01} format={pct} onChange={(v) => updateAssumption('referralCoeff', v)} />
                <Slider label="Individual-to-org upgrade rate/yr" value={assumptions.upgradeRate} min={0} max={0.3} step={0.01} format={pct} onChange={(v) => updateAssumption('upgradeRate', v)} />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Usage</div>
                <Slider label="Campaigns per individual/year" value={assumptions.campaignsPerIndiv} min={0.5} max={12} step={0.5} format={(v) => v} onChange={(v) => updateAssumption('campaignsPerIndiv', v)} />
                <Slider label="Campaigns per org/year" value={assumptions.campaignsPerOrg} min={1} max={24} step={1} format={(v) => v} onChange={(v) => updateAssumption('campaignsPerOrg', v)} />
                <Slider label="Blitz adoption rate (orgs)" value={assumptions.blitzAdoption} min={0} max={1} step={0.05} format={pct} onChange={(v) => updateAssumption('blitzAdoption', v)} />
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E5E0D5', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={resetDefaults}
                style={{
                  padding: '10px 24px',
                  borderRadius: 24,
                  border: '1.5px solid #E5E0D5',
                  background: '#fff',
                  color: '#6B5E4E',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset to defaults
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── 5. Unit economics ─────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle>Unit Economics</SectionTitle>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 40 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Individual Organiser LTV
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 900, color: '#16A34A', marginBottom: 8 }}>
            {aud(ltvIndiv)}
          </div>
          <div style={{ fontSize: 13, color: '#9B8F80', lineHeight: 1.6 }}>
            Based on {assumptions.campaignsPerIndiv} campaigns/yr at {aud(PRICE_INDIVIDUAL)}/campaign over ~2.5yr avg tenure.
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#F0FBF6', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginBottom: 4 }}>Revenue per campaign</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{aud(PRICE_INDIVIDUAL)}</div>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Organisation Client LTV
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 900, color: '#7C3AED', marginBottom: 8 }}>
            {aud(ltvOrg)}
          </div>
          <div style={{ fontSize: 13, color: '#9B8F80', lineHeight: 1.6 }}>
            Annual plan + {assumptions.campaignsPerOrg} campaigns/yr + 2 Blitz/yr over ~3yr avg tenure.
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', background: '#FAF5FF', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>Annual plan</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{aud(PRICE_ORG_ANNUAL)}/yr</div>
            </div>
            <div style={{ padding: '10px 12px', background: '#FFFBEB', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>Blitz event</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{aud(PRICE_BLITZ)}/event</div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9B8F80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Break-Even Analysis
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 900, color: breakEvenMonth < 0 ? '#DC2626' : '#16A34A', marginBottom: 8 }}>
            {breakEvenMonth < 0 ? 'N/A' : monthLabel(breakEvenMonth)}
          </div>
          <div style={{ fontSize: 13, color: '#9B8F80', lineHeight: 1.6, marginBottom: 16 }}>
            Fixed costs {aud(FIXED_COSTS)}/month. Break-even requires {Math.ceil(FIXED_COSTS / PRICE_INDIVIDUAL)} individual campaigns or {Math.ceil(FIXED_COSTS / (PRICE_ORG_ANNUAL / 12))} org plan subscriptions monthly.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allMonths.slice(0, 6).map((m) => (
              <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B5E4E' }}>{m.label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 800,
                  color: m.net >= 0 ? '#16A34A' : '#DC2626',
                  background: m.net >= 0 ? '#F0FBF6' : '#FFF5F5',
                  padding: '2px 8px', borderRadius: 6,
                }}>
                  {m.net >= 0 ? '+' : ''}{aud(m.net)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 6. Model methodology ──────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle>Model Methodology and Assumptions</SectionTitle>
      </div>
      <Card style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.8 }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 12 }}>Pipeline and Conversion</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>50 individual organiser leads</strong> identified through existing network. 15% conversion rate per month, tapering as the list is exhausted. Pipeline is fully depleted by month 8-10.</li>
                <li><strong>20 organisation leads</strong> (clubs, schools, sporting bodies). 10% monthly conversion rate, reflecting a longer sales cycle requiring committee sign-off.</li>
                <li><strong>Individual-to-org upgrade:</strong> 5% of individual organisers per year recognise the value of the org plan and upgrade, adding to the recurring revenue base.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 12 }}>Organic Growth and Referrals</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Organic acquisition:</strong> 2 new individual organisers per month from month 1, independent of pipeline (word of mouth, social, search). This grows as the installed base grows.</li>
                <li><strong>Referral coefficient of 8%:</strong> For every 100 active organisers, 8 additional organisers join through direct referral each month. Compounds significantly in years 2-5.</li>
                <li><strong>First-mover advantage:</strong> Lucky Squares is the first purpose-built Lucky Squares platform in Australia. No direct competitors currently exist in this niche, supporting stronger early conversion rates.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 12 }}>Usage and Revenue</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Individual organisers run 2.5 campaigns per year</strong> on average (approximately one per school term, with some running seasonal campaigns only).</li>
                <li><strong>Org plan clients run 6 campaigns per year</strong> — higher frequency reflects that clubs and schools run multiple fundraisers across the year.</li>
                <li><strong>Blitz events from month 3:</strong> 50% of org plan clients run one Blitz event per year at $99. This is a conservative estimate given the strong incentive (whole-of-club participation, leaderboard, prizes). Introduced conservatively from month 3.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 12 }}>Seasonality</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Australian school term pattern applied:</strong> Term 1 (Feb-Mar) and Term 4 (Oct-Nov) are peak fundraising periods. July is the lowest month (school holidays). Weights range from 0.75x (Jul) to 1.2x (Apr, Oct).</li>
                <li>Seasonal weighting is applied to campaign volume, not to organiser sign-ups, which are assumed to be more evenly distributed.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 12 }}>Scenarios</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Conservative (70%):</strong> Slower pipeline conversion, lower referral uptake, fewer campaigns per organiser. Reflects a difficult early market or slower word-of-mouth.</li>
                <li><strong>Base (100%):</strong> Default assumptions as described above.</li>
                <li><strong>Optimistic (140%):</strong> Faster conversion, stronger referral loop, higher campaign frequency. Reflects strong early press, a successful beta cohort, or an influencer-driven spike.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1209', marginBottom: 12 }}>Costs and TAM</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><strong>Fixed costs of $600/month</strong> cover platform infrastructure (Supabase, Vercel, Resend, Stripe). This excludes wages and marketing spend.</li>
                <li><strong>Total Addressable Market (TAM):</strong> 15,000 eligible Australian organisations including schools, sporting clubs, community groups, and charities. Market penetration milestones are shown in the 5-year view.</li>
                <li>All projections are estimates only and will self-correct as actual platform data accumulates. Actual figures are pulled directly from the platform database where available.</li>
              </ul>
            </div>

          </div>
        </div>
      </Card>

      {/* Footer note */}
      <div style={{ fontSize: 12, color: '#9B8F80', textAlign: 'center', paddingBottom: 40 }}>
        Model assumptions stored in browser localStorage. TAM: {TAM.toLocaleString('en-AU')} eligible Australian organisations.
        All figures are projections only.
      </div>
      </>}
    </div>
  );
}
