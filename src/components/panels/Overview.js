'use client';
import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useModel } from '@/context/ModelContext';
import { useUI } from '@/context/UIContext';
import { fmtDollar, parseRaw } from '@/lib/formatters';
import { sumEmpAnnual, sumContractorAnnual, computeClose } from '@/lib/calculations';
import { getMonthKeys, getCurrentMonthKey, getMonthMode, MNAMES } from '@/lib/monthKeys';

const OverviewCharts = dynamic(() => import('./OverviewCharts'), { ssr: false });

function loadDemoData(dispatch) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const mk = (offset) => {
    const d = new Date(y, m - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Team
  const empRows = [
    { label: 'CEO / Founder', base: 120000, bPct: 22, isCut: false, effectiveMonth: '' },
    { label: 'CTO', base: 150000, bPct: 22, isCut: false, effectiveMonth: '' },
    { label: 'Engineer 1', base: 130000, bPct: 22, isCut: false, effectiveMonth: '' },
    { label: 'Engineer 2', base: 125000, bPct: 22, isCut: false, effectiveMonth: '' },
    { label: 'Head of Sales', base: 110000, bPct: 22, isCut: false, effectiveMonth: '' },
  ];
  const contractorRows = [
    { label: 'Fractional CFO', amount: 72000, isCut: false, effectiveMonth: '' },
    { label: 'Design Contractor', amount: 48000, isCut: false, effectiveMonth: '' },
  ];
  const newHireRows = [
    { label: 'Senior Engineer', base: 160000, bPct: 22, effectiveMonth: mk(3) },
    { label: 'Product Manager', base: 140000, bPct: 22, effectiveMonth: mk(5) },
  ];

  // Revenue
  const revenueClientRows = [
    { label: 'Acme Corp', amount: 18000, startMonth: mk(-4) },
    { label: 'Globex Inc', amount: 12000, startMonth: mk(-2) },
    { label: 'Initech', amount: 8000, startMonth: mk(1) },
  ];

  // Actuals: 6 months of history
  const actuals = {};
  const expenseCategories = [
    { name: 'Salaries', fixed: true },
    { name: 'Benefits', fixed: true },
    { name: 'Rent', amount: '' },
    { name: 'Software', amount: '' },
    { name: 'Legal & Accounting', amount: '' },
    { name: 'Marketing', amount: '' },
    { name: 'Insurance', amount: '' },
    { name: 'Other', amount: '' },
  ];

  let runningCash = 1800000;
  for (let offset = -6; offset <= -1; offset++) {
    const key = mk(offset);
    // Slight randomization for realistic data
    const rand = () => 0.92 + Math.random() * 0.16; // 0.92 - 1.08
    const salaries = Math.round(52000 * rand());
    const benefits = Math.round(11000 * rand());
    const rent = 8500;
    const software = Math.round(3200 * rand());
    const legal = offset === -3 ? 12000 : Math.round(1500 * rand());
    const marketing = Math.round(4500 * rand());
    const insurance = 2200;
    const other = Math.round(2000 * rand());
    const totalExp = salaries + benefits + rent + software + legal + marketing + insurance + other;
    // Revenue ramps up
    const revAmount = offset <= -4 ? 18000 : offset <= -2 ? 30000 : 38000;
    const closing = runningCash - totalExp + revAmount;

    actuals[key] = {
      mode: 'actuals',
      openingBalance: runningCash,
      expenses: [
        { name: 'Salaries', amount: salaries, fixed: true },
        { name: 'Benefits', amount: benefits, fixed: true },
        { name: 'Rent', amount: rent },
        { name: 'Software', amount: software },
        { name: 'Legal & Accounting', amount: legal },
        { name: 'Marketing', amount: marketing },
        { name: 'Insurance', amount: insurance },
        { name: 'Other', amount: other },
      ],
      revenue: revAmount,
      notes: '',
    };
    runningCash = closing;
  }

  // Current month: opening balance only
  actuals[mk(0)] = {
    mode: 'actuals',
    openingBalance: runningCash,
    expenses: expenseCategories.map(c => ({ ...c, amount: '' })),
    revenue: '',
    notes: '',
  };

  dispatch({
    type: 'LOAD_STATE',
    payload: {
      bankBalance: runningCash,
      otherCosts: 0,
      estimatedRevenue: 0,
      masterBenefitsPct: 22,
      gridStartKey: mk(-6),
      gridEndKey: mk(18),
      actualsCutoffKey: mk(-1),
      empRows,
      contractorRows,
      newHireRows,
      revenueClientRows,
      actuals,
      committedCapital: 250000,
    },
  });
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Overview() {
  const { state, dispatch } = useModel();
  const goToModel = (tab) => { if (tab) setModelTab(tab); setActivePanel('model'); };
  const { setActivePanel, setModelTab } = useUI();
  const { empRows, contractorRows, newHireRows, revenueClientRows, actuals } = state;

  // Track when model was last updated
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('just now');

  useEffect(() => {
    setLastUpdated(new Date());
  }, [empRows, contractorRows, newHireRows, revenueClientRows, actuals, state.bankBalance, state.committedCapital]);

  useEffect(() => {
    setLastUpdatedLabel(timeAgo(lastUpdated));
    const interval = setInterval(() => {
      setLastUpdatedLabel(timeAgo(lastUpdated));
    }, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const empAnnual = useMemo(() => sumEmpAnnual(empRows), [empRows]);
  const ctAnnual = useMemo(() => sumContractorAnnual(contractorRows), [contractorRows]);
  const revenue = useMemo(
    () => revenueClientRows.reduce((s, r) => s + (parseRaw(r.amount) || 0), 0),
    [revenueClientRows]
  );
  const committedCapital = parseRaw(state.committedCapital);
  const monthlyBurn = (empAnnual + ctAnnual) / 12;
  const netBurn = monthlyBurn - revenue;
  const totalAnnual = empAnnual + ctAnnual;

  const months = useMemo(() => getMonthKeys(state.gridStartKey, state.gridEndKey), [state.gridStartKey, state.gridEndKey]);
  const curKey = getCurrentMonthKey();
  const now = new Date();

  // Find latest cash position
  const curIdx = months.findIndex(m => m.key === curKey);
  let latestCash = parseFloat(state.bankBalance) || 0;
  for (let i = 0; i <= (curIdx >= 0 ? curIdx : months.length - 1); i++) {
    const close = computeClose(months[i].key, actuals, state);
    if (close !== null) latestCash = close;
  }

  // Runway calculation (includes committed capital)
  const effectiveCash = latestCash + committedCapital;
  let runwayMonths = 0;
  let cashOutDate = null;
  if (netBurn > 0 && effectiveCash > 0) {
    runwayMonths = Math.floor(effectiveCash / netBurn);
    const cashOutMonth = new Date(now);
    cashOutMonth.setMonth(cashOutMonth.getMonth() + runwayMonths);
    cashOutDate = `${MNAMES[cashOutMonth.getMonth()]} ${cashOutMonth.getFullYear()}`;
  }

  const pct = Math.min((runwayMonths / 24) * 100, 100);
  const col = runwayMonths < 4 ? '#ef4444' : runwayMonths < 8 ? '#f59e0b' : '#22c55e';

  // --- Chart data ---
  const projectionData = useMemo(() => {
    if (months.length === 0) return [];
    const points = [];
    let runningCash = parseFloat(state.bankBalance) || 0;
    const cutoffKey = state.actualsCutoffKey || '';

    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const isActual = getMonthMode(m.key, cutoffKey) === 'actuals';
      const close = computeClose(m.key, actuals, state);
      if (close !== null) {
        runningCash = close;
        points.push({ label: m.label, cash: close, isActual });
      } else {
        // projected: subtract net burn from last known balance
        runningCash = runningCash - netBurn;
        points.push({ label: m.label, cash: runningCash, isActual: false });
      }
    }
    return points;
  }, [months, actuals, state, netBurn]);

  const burnBreakdown = useMemo(() => ({
    salaries: empAnnual / 12,
    contractors: ctAnnual / 12,
    overhead: 0,
  }), [empAnnual, ctAnnual]);

  const cashOutIdx = useMemo(() => {
    for (let i = 0; i < projectionData.length; i++) {
      if (projectionData[i].cash < 0) return i;
    }
    return -1;
  }, [projectionData]);

  // Variance data: actual expenses/revenue vs model estimate for each actuals month
  const varianceData = useMemo(() => {
    const { getEffectiveExpTotal, getEffectiveRevenue, getEstimateValues } = require('@/lib/calculations');
    const { getMonthMode } = require('@/lib/monthKeys');
    const { parseGridNum } = require('@/lib/formatters');
    const points = [];
    months.forEach(({ key, label }) => {
      const isActual = getMonthMode(key, state.actualsCutoffKey || '') === 'actuals';
      if (!isActual) return;
      const monthData = actuals[key];
      if (!monthData) return;
      // Check if this month has real expense data
      const hasExpData = (monthData.expenses || []).some(
        e => e.amount !== '' && e.amount !== undefined && e.amount !== null && parseGridNum(e.amount) !== 0
      );
      if (!hasExpData) return;
      const ev = getEstimateValues(key, state);
      const actualExp = getEffectiveExpTotal(key, actuals, state);
      const actualRev = getEffectiveRevenue(key, actuals, state);
      const estExp = ev.salaries + ev.other;
      const estRev = ev.revenue;
      points.push({
        label,
        actualExp,
        estExp,
        actualRev,
        estRev,
        expVariance: actualExp - estExp,
        revVariance: actualRev - estRev,
      });
    });
    return points;
  }, [months, actuals, state]);

  const pipeline = revenueClientRows.filter(c => c.amount > 0);
  const pipelineTotal = pipeline.reduce((s, c) => s + (c.amount || 0), 0);

  // Empty state detection
  const hasTeam = empRows.length > 0 || contractorRows.length > 0;
  const hasRevenue = revenue > 0 || revenueClientRows.length > 0;
  const hasActuals = Object.keys(actuals || {}).length > 0;
  const hasBankBalance = (parseFloat(state.bankBalance) || 0) > 0;
  const isEmpty = !hasTeam && !hasRevenue && !hasActuals && !hasBankBalance;

  // Runway hero display
  const isInfinite = netBurn <= 0 && (hasRevenue || hasBankBalance);
  const isVeryLong = runwayMonths > 120;
  const isUrgent = netBurn > 0 && runwayMonths > 0 && runwayMonths <= 6;

  if (isEmpty) {
    return (
      <div id="runway" className="panel active" style={{ animation: 'fadeUp .4s ease' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '70vh',
        }}>
          <div className="card" style={{
            maxWidth: 480, width: '100%', padding: '48px 40px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59,130,246,.12), rgba(99,102,241,.08))',
              border: '1px solid rgba(59,130,246,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div style={{
              fontSize: 32, fontWeight: 300, letterSpacing: '-.02em',
              marginBottom: 8, fontFamily: "'Fraunces', serif",
            }}>
              Welcome to Runway
            </div>
            <p style={{
              color: 'var(--muted)', fontSize: 14, lineHeight: 1.7,
              marginBottom: 32, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto',
            }}>
              Build your financial model in a few steps. Add your team, enter your cash position, and start forecasting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn"
                style={{
                  width: '100%', padding: '12px 20px',
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
                onClick={() => goToModel('team')}
              >
                Add your team
              </button>
              <button
                className="btn"
                style={{
                  width: '100%', padding: '12px 20px',
                  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}
                onClick={() => setActivePanel('actuals')}
              >
                Enter your cash position
              </button>
              <button
                className="btn"
                style={{
                  width: '100%', padding: '12px 20px',
                  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}
                onClick={() => goToModel('financials')}
              >
                Add revenue
              </button>
              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 0', paddingTop: 16 }}>
                <button
                  style={{
                    width: '100%', padding: '12px 20px',
                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                    color: '#fff', border: 'none',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onClick={() => loadDemoData(dispatch)}
                >
                  Load demo data
                </button>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  Populate a sample startup model to explore the app
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="runway" className="panel active" style={{ animation: 'fadeUp .4s ease' }}>
      {/* Cash Runway Hero */}
      <div className="card dash-hero">
        <div className="dash-hero-inner">
          <div className="dash-hero-left">
            <div className="dash-hero-label">Cash Runway</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{
                fontSize: 72, fontWeight: 200, lineHeight: 1,
                letterSpacing: '-.04em', color: col,
                fontFamily: "'Fraunces', serif",
                textShadow: `0 0 40px ${col}44, 0 0 80px ${col}22`,
              }}>
                {isInfinite ? '\u221E' : isVeryLong ? '10+' : runwayMonths || '\u2014'}
              </div>
              {isUrgent && (
                <span style={{
                  display: 'inline-block', width: 8, height: 8,
                  borderRadius: '50%', background: '#ef4444',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  marginLeft: 4, flexShrink: 0,
                }} />
              )}
            </div>
            <div className="dash-hero-sub" style={{ fontSize: 14, marginTop: 4 }}>
              {isInfinite
                ? 'revenue exceeds burn'
                : isVeryLong
                  ? 'years of runway'
                  : netBurn > 0 && runwayMonths > 0
                    ? 'months of runway'
                    : 'add data to calculate'}
            </div>
            {isUrgent && (
              <div style={{
                marginTop: 8, fontSize: 12, fontWeight: 600,
                color: '#ef4444', letterSpacing: '.02em',
                textTransform: 'uppercase',
              }}>
                Runway is getting short
              </div>
            )}
            <div className="dash-runway-bar-wrap" style={{ marginTop: 16 }}>
              <div className="dash-runway-bar">
                <div className="dash-runway-fill" style={{ width: `${pct}%`, background: col }}></div>
              </div>
            </div>
          </div>
          <div className="dash-hero-right">
            <div className="dash-hero-label">Cash-Out Date</div>
            <div className="dash-hero-date">{cashOutDate || (netBurn <= 0 ? 'No cash-out' : '\u2014')}</div>
            <div className="dash-hero-sub">{cashOutDate ? 'projected cash-out' : netBurn <= 0 ? 'net cash positive' : ''}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dash-kpi-grid stagger-in">
        <div className="card dash-kpi" style={{ cursor: 'pointer' }} onClick={() => setActivePanel('actuals')}>
          <div className="dash-kpi-label">Cash Position &mdash; {MNAMES[now.getMonth()]}</div>
          <div className="dash-kpi-val">{fmtDollar(latestCash)}</div>
          {committedCapital > 0 && (
            <div className="dash-kpi-sub">+ {fmtDollar(committedCapital)} committed = {fmtDollar(effectiveCash)} effective</div>
          )}
        </div>
        <div className="card dash-kpi" style={{ cursor: 'pointer' }} onClick={() => goToModel('team')}>
          <div className="dash-kpi-label">Monthly Burn</div>
          <div className="dash-kpi-val dash-kpi-neg">{fmtDollar(monthlyBurn)}</div>
          <div className="dash-kpi-sub">{fmtDollar(totalAnnual)}/yr payroll</div>
        </div>
        <div className="card dash-kpi" style={{ cursor: 'pointer' }} onClick={() => goToModel('financials')}>
          <div className="dash-kpi-label">Monthly Revenue</div>
          <div className="dash-kpi-val dash-kpi-pos">{revenue > 0 ? fmtDollar(revenue) : '\u2014'}</div>
          <div className="dash-kpi-sub">{revenue > 0 ? `${fmtDollar(revenue * 12)}/yr` : 'no revenue entered'}</div>
        </div>
        <div className="card dash-kpi" style={{ cursor: 'pointer' }} onClick={() => setActivePanel('actuals')}>
          <div className="dash-kpi-label">Net Burn</div>
          <div className={`dash-kpi-val ${netBurn > 0 ? 'dash-kpi-neg' : 'dash-kpi-pos'}`}>{fmtDollar(Math.abs(netBurn))}</div>
          <div className="dash-kpi-sub">{netBurn > 0 ? 'cash outflow / month' : 'cash inflow / month'}</div>
        </div>
      </div>

      {/* Charts */}
      <OverviewCharts projectionData={projectionData} burnBreakdown={burnBreakdown} cashOutIdx={cashOutIdx} varianceData={varianceData} />

      {/* Team Snapshot + Revenue Pipeline */}
      <div className="dash-bottom-row">
        <div className="card dash-bottom-card">
          <div className="dash-section-title">Team Snapshot</div>
          {hasTeam ? (
            <div className="dash-team-grid">
              <div className="dash-team-item" style={{ cursor: 'pointer' }} onClick={() => goToModel('team')}><span className="dash-team-label">Employees</span><span className="dash-team-val">{empRows.length} <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>&rarr;</span></span></div>
              <div className="dash-team-item" style={{ cursor: 'pointer' }} onClick={() => goToModel('team')}><span className="dash-team-label">Contractors</span><span className="dash-team-val">{contractorRows.length} <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>&rarr;</span></span></div>
              <div className="dash-team-item" style={{ cursor: 'pointer' }} onClick={() => goToModel('team')}><span className="dash-team-label">Planned Reductions</span><span className="dash-team-val" style={{color:'var(--red)'}}>{empRows.filter(r=>r.isCut).length + contractorRows.filter(r=>r.isCut).length}</span></div>
              <div className="dash-team-item" style={{ cursor: 'pointer' }} onClick={() => goToModel('team')}><span className="dash-team-label">Planned Hires</span><span className="dash-team-val" style={{color:'var(--green)'}}>{newHireRows.length}</span></div>
              <div className="dash-team-item" style={{ cursor: 'pointer' }} onClick={() => goToModel('team')}><span className="dash-team-label">Annual Payroll</span><span className="dash-team-val">{fmtDollar(totalAnnual)}</span></div>
            </div>
          ) : (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              color: 'var(--muted)', fontSize: 13, lineHeight: 1.7,
            }}>
              No team added yet &mdash;{' '}
              <span
                style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => goToModel('team')}
              >
                get started in Model &rarr; Team
              </span>
            </div>
          )}
        </div>
        <div className="card dash-bottom-card">
          <div className="dash-section-title">Revenue Pipeline</div>
          <div className="dash-pipeline-list">
            {pipeline.length > 0 ? pipeline.map((c, i) => (
              <div key={i} className="dash-pipeline-item" style={{ cursor: 'pointer' }} onClick={() => goToModel('financials')}>
                <span className="dash-pipeline-name">{c.label || 'Unnamed'}</span>
                <div className="dash-pipeline-meta">
                  <span className="dash-pipeline-start">from {c.startMonth || '\u2014'}</span>
                  <span className="dash-pipeline-amt">{fmtDollar(c.amount)}/mo</span>
                </div>
              </div>
            )) : (
              <div style={{
                padding: '24px 16px', textAlign: 'center',
                color: 'var(--muted)', fontSize: 13, lineHeight: 1.7,
              }}>
                No revenue yet &mdash;{' '}
                <span
                  style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => goToModel('financials')}
                >
                  add clients in Model &rarr; Financials
                </span>
              </div>
            )}
          </div>
          {pipeline.length > 0 && (
            <div className="dash-pipeline-total">
              <span>Pipeline Total (monthly)</span>
              <span style={{color:'var(--green)',fontWeight:600}}>{pipelineTotal > 0 ? fmtDollar(pipelineTotal) + '/mo' : '\u2014'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div style={{
        textAlign: 'center', padding: '20px 0 8px',
        fontSize: 11, color: 'var(--muted2)', letterSpacing: '.02em',
      }}>
        Model last updated: {lastUpdatedLabel}
      </div>

      {/* Pulse animation for urgency dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
