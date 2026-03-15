'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useModel } from '@/context/ModelContext';
import { fmtDollar, parseRaw, fmtSalary } from '@/lib/formatters';
import { sumEmpAnnual, sumContractorAnnual, sumNewHireAnnual, getCutTotal } from '@/lib/calculations';
import { getMonthOptions } from '@/lib/monthKeys';

function SalaryInput({ value, onChange, placeholder = 'e.g. 120,000.00', style }) {
  const inputRef = useRef(null);
  const rawRef = useRef(value);

  useEffect(() => {
    rawRef.current = value;
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value ? fmtSalary(value) : '';
    }
  }, [value]);

  function handleFocus(e) {
    const raw = parseRaw(rawRef.current);
    e.target.value = raw > 0 ? String(raw) : '';
    e.target.select();
  }
  function handleBlur(e) {
    const raw = parseRaw(e.target.value);
    rawRef.current = raw;
    onChange(raw);
    e.target.value = raw > 0 ? fmtSalary(raw) : '';
  }
  return (
    <input
      ref={inputRef}
      type="text"
      className="ifield salary-input"
      defaultValue={value ? fmtSalary(value) : ''}
      placeholder={placeholder}
      style={{ textAlign: 'right', ...style }}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

/* Badge styles */
const badgeBase = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '2px 7px',
  borderRadius: 100,
  whiteSpace: 'nowrap',
};
const badges = {
  employee: { ...badgeBase, background: 'rgba(59,130,246,.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,.2)' },
  contractor: { ...badgeBase, background: 'rgba(139,92,246,.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,.2)' },
  hire: { ...badgeBase, background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.2)' },
};

export default function Model() {
  const { state, dispatch } = useModel();
  const [activeTab, setActiveTab] = useState('team');

  const { empRows, contractorRows, revenueClientRows, newHireRows } = state;
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // --- Computed totals ---
  const empAnnual = useMemo(() => sumEmpAnnual(empRows), [empRows]);
  const ctAnnual = useMemo(() => sumContractorAnnual(contractorRows), [contractorRows]);
  const hireAnnual = useMemo(() => sumNewHireAnnual(newHireRows), [newHireRows]);
  const cutAnnual = useMemo(() => getCutTotal(empRows, contractorRows), [empRows, contractorRows]);
  const totalAnnualPayroll = empAnnual + ctAnnual;
  const other = parseRaw(state.otherCosts);
  const revenue = useMemo(
    () => revenueClientRows.reduce((s, r) => s + (parseRaw(r.amount) || 0), 0),
    [revenueClientRows],
  );
  const monthlyBurn = totalAnnualPayroll / 12 + other - revenue;
  const scenarioAnnual = totalAnnualPayroll - cutAnnual + hireAnnual;
  const scenarioBurn = scenarioAnnual / 12 + other - revenue;
  const hasFutureChanges = newHireRows.length > 0 || cutAnnual > 0;

  // --- Build unified team list ---
  const teamList = useMemo(() => {
    const list = [];
    empRows.forEach((row, i) => {
      const base = parseRaw(row.base);
      const pct = row.bPct || 0;
      list.push({
        kind: 'employee', storeType: 'emp', storeIndex: i,
        label: row.label, salary: base, bPct: pct,
        monthlyCost: (base * (1 + pct / 100)) / 12,
        endMonth: row.effectiveMonth || '', isCut: !!row.isCut,
      });
    });
    contractorRows.forEach((row, i) => {
      const amount = parseRaw(row.amount);
      list.push({
        kind: 'contractor', storeType: 'ct', storeIndex: i,
        label: row.label, salary: amount, bPct: 0,
        monthlyCost: amount / 12,
        endMonth: row.effectiveMonth || '', isCut: !!row.isCut,
      });
    });
    newHireRows.forEach((row, i) => {
      const base = parseRaw(row.base);
      const pct = row.bPct || 0;
      list.push({
        kind: 'hire', storeType: 'hire', storeIndex: i,
        label: row.label, salary: base, bPct: pct,
        monthlyCost: (base * (1 + pct / 100)) / 12,
        startMonth: row.effectiveMonth || '',
      });
    });
    return list;
  }, [empRows, contractorRows, newHireRows]);

  const activeTeam = teamList.filter(t => !t.isCut);
  const endingTeam = teamList.filter(t => t.isCut);
  const totalMonthly = activeTeam.reduce((s, t) => s + t.monthlyCost, 0) + other;

  // --- Actions ---
  const addEmployee = useCallback(() => {
    dispatch({ type: 'ADD_EMPLOYEE', payload: { label: '', base: 0, bPct: 22, isCut: false, effectiveMonth: '' } });
  }, [dispatch]);

  const addContractor = useCallback(() => {
    dispatch({ type: 'ADD_CONTRACTOR', payload: { label: '', amount: 0, isCut: false, effectiveMonth: '' } });
  }, [dispatch]);

  const addNewHire = useCallback(() => {
    dispatch({ type: 'ADD_NEW_HIRE', payload: { label: '', base: 0, bPct: 22, effectiveMonth: '' } });
  }, [dispatch]);

  const updateTeamMember = useCallback((item, payload) => {
    if (item.storeType === 'emp') dispatch({ type: 'UPDATE_EMPLOYEE', index: item.storeIndex, payload });
    else if (item.storeType === 'ct') dispatch({ type: 'UPDATE_CONTRACTOR', index: item.storeIndex, payload });
    else if (item.storeType === 'hire') dispatch({ type: 'UPDATE_NEW_HIRE', index: item.storeIndex, payload });
  }, [dispatch]);

  const removeTeamMember = useCallback((item) => {
    const name = item.label?.trim() || item.kind;
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    if (item.storeType === 'emp') dispatch({ type: 'REMOVE_EMPLOYEE', index: item.storeIndex });
    else if (item.storeType === 'ct') dispatch({ type: 'REMOVE_CONTRACTOR', index: item.storeIndex });
    else if (item.storeType === 'hire') dispatch({ type: 'REMOVE_NEW_HIRE', index: item.storeIndex });
  }, [dispatch]);

  // --- Revenue actions ---
  const addClient = useCallback(() => {
    dispatch({ type: 'ADD_REVENUE_CLIENT', payload: { label: '', amount: 0, startMonth: '' } });
  }, [dispatch]);
  const updateClient = useCallback((index, payload) => {
    dispatch({ type: 'UPDATE_REVENUE_CLIENT', index, payload });
  }, [dispatch]);
  const removeClient = useCallback((index) => {
    const name = revenueClientRows[index]?.label?.trim() || 'this client';
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    dispatch({ type: 'REMOVE_REVENUE_CLIENT', index });
  }, [dispatch, revenueClientRows]);

  // Grid column template for team rows
  const teamGridCols = 'minmax(100px, 1.5fr) 70px 120px 100px 110px 30px';

  function renderTeamRow(item) {
    const isHire = item.kind === 'hire';
    const salaryField = item.storeType === 'ct' ? 'amount' : 'base';

    return (
      <div
        key={`${item.storeType}-${item.storeIndex}`}
        style={{
          display: 'grid',
          gridTemplateColumns: teamGridCols,
          gap: 5,
          alignItems: 'center',
          marginBottom: 5,
          opacity: item.isCut ? 0.45 : 1,
        }}
      >
        {/* Name + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <input
            type="text"
            className="ifield"
            value={item.label || ''}
            placeholder={isHire ? 'New hire role' : item.kind === 'contractor' ? 'Contractor' : 'Employee name'}
            style={{ flex: 1, minWidth: 0 }}
            onChange={(e) => updateTeamMember(item, { label: e.target.value })}
          />
          <span style={badges[item.kind]}>{item.kind === 'hire' ? 'Hire' : item.kind === 'contractor' ? '1099' : 'W-2'}</span>
        </div>

        {/* Benefits % (hidden for contractors) */}
        {item.storeType !== 'ct' ? (
          <input
            type="number"
            className="ifield"
            value={item.bPct}
            min={0} max={100}
            style={{ textAlign: 'right', width: 60, fontSize: 12 }}
            onChange={(e) => updateTeamMember(item, { bPct: parseFloat(e.target.value) || 0 })}
            title="Benefits %"
          />
        ) : (
          <span style={{ textAlign: 'right', fontSize: 10, color: 'var(--muted)' }}>—</span>
        )}

        {/* Annual salary */}
        <SalaryInput
          value={item.salary}
          onChange={(val) => updateTeamMember(item, { [salaryField]: val })}
          placeholder="Salary"
        />

        {/* Monthly cost (computed) */}
        <span style={{
          textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: item.monthlyCost > 0 ? 'var(--text)' : 'var(--muted)',
          fontWeight: 500,
          textDecoration: item.isCut ? 'line-through' : 'none',
        }}>
          {item.monthlyCost > 0 ? fmtDollar(item.monthlyCost) : '\u2014'}
          <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 10 }}>/mo</span>
        </span>

        {/* Start/End month */}
        {isHire ? (
          <select
            className="ifield"
            value={item.startMonth || ''}
            onChange={(e) => updateTeamMember(item, { effectiveMonth: e.target.value })}
            style={{ fontSize: 11, padding: '5px 6px', color: 'var(--green)' }}
            title="Start month"
          >
            <option value="">Start...</option>
            {monthOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}{opt.isCurrent ? ' \u2190' : ''}</option>
            ))}
          </select>
        ) : (
          <select
            className="ifield"
            value={item.endMonth || ''}
            onChange={(e) => updateTeamMember(item, {
              effectiveMonth: e.target.value,
              isCut: !!e.target.value,
            })}
            style={{ fontSize: 11, padding: '5px 6px', color: item.endMonth ? 'var(--red)' : 'var(--muted)' }}
            title="End month (leave blank if ongoing)"
          >
            <option value="">No end</option>
            {monthOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}{opt.isCurrent ? ' \u2190' : ''}</option>
            ))}
          </select>
        )}

        {/* Delete */}
        <button className="btn-remove" onClick={() => removeTeamMember(item)} title="Remove">&times;</button>
      </div>
    );
  }

  return (
    <div id="model" className="panel active">
      {/* Summary bar */}
      <div className="grand-total-box burn-sticky-summary">
        <div>
          <div className="label">Team</div>
          <div className="val">{empRows.length + contractorRows.length}</div>
        </div>
        <div>
          <div className="label">Monthly Payroll</div>
          <div className="val">{fmtDollar(totalAnnualPayroll / 12)}</div>
        </div>
        <div>
          <div className="label">Monthly Overhead</div>
          <div className="val">{fmtDollar(other)}</div>
        </div>
        <div>
          <div className="label">Monthly Revenue</div>
          <div className="val" style={{ color: 'var(--green)' }}>{revenue > 0 ? fmtDollar(revenue) : '\u2014'}</div>
        </div>
        <div>
          <div className="label">Monthly Burn</div>
          <div className="val">{fmtDollar(monthlyBurn)}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--surface2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
        {['Team', 'Financials'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{
              flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none',
              background: activeTab === tab.toLowerCase() ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.toLowerCase() ? 'var(--text)' : 'var(--muted)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: activeTab === tab.toLowerCase() ? 600 : 400,
              letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
              boxShadow: activeTab === tab.toLowerCase() ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              transition: 'all .15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ========== TEAM TAB ========== */}
      {activeTab === 'team' && (
        <>
          <div className="card">
            <div className="card-title">Your <em>team</em></div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: teamGridCols, gap: 5,
              marginBottom: 8, padding: '0 0 6px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Name</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right' }}>Ben %</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right' }}>Annual Salary</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right' }}>Monthly Cost</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Dates</span>
              <span></span>
            </div>

            {/* Active team members */}
            {activeTeam.map(renderTeamRow)}

            {/* Ending team members */}
            {endingTeam.length > 0 && (
              <>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--red)',
                  letterSpacing: '.08em', textTransform: 'uppercase', margin: '12px 0 6px',
                  paddingTop: 8, borderTop: '1px dashed rgba(220,38,38,.2)',
                }}>
                  Ending
                </div>
                {endingTeam.map(renderTeamRow)}
              </>
            )}

            {/* Add buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn-add" onClick={addEmployee}>+ Employee</button>
              <button className="btn-add" onClick={addContractor}>+ Contractor</button>
              <button className="btn-add" onClick={addNewHire} style={{ borderColor: 'rgba(34,197,94,.2)', color: 'var(--green)', background: 'rgba(34,197,94,.04)' }}>+ Planned hire</button>
            </div>

            {/* Totals */}
            <div className="section-total-row">
              <span className="section-total-label">Monthly Total (team + overhead)</span>
              <span className="section-total-val" style={{ fontSize: 18 }}>{fmtDollar(totalMonthly)}</span>
            </div>
          </div>

          {/* Scenario impact */}
          {hasFutureChanges && (
            <div style={{
              background: 'var(--surface2)', border: '1px solid rgba(180,120,0,.2)', borderRadius: 8,
              padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Impact of planned changes</div>
                <div style={{ fontSize: 13 }}>
                  {cutAnnual > 0 && <span style={{ color: 'var(--green)', marginRight: 14 }}>Endings save {fmtDollar(cutAnnual / 12)}/mo</span>}
                  {hireAnnual > 0 && <span style={{ color: 'var(--red)' }}>Hires add {fmtDollar(hireAnnual / 12)}/mo</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Burn after changes</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: scenarioBurn > monthlyBurn ? 'var(--red)' : 'var(--green)' }}>
                  {fmtDollar(scenarioBurn)}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== FINANCIALS TAB ========== */}
      {activeTab === 'financials' && (
        <>
        {/* Monthly Overhead */}
        <div className="card">
          <div className="card-title">Monthly <em>overhead</em></div>
          <div className="card-mono">Rent, software, insurance, and other recurring non-payroll costs</div>
          <div style={{ marginTop: 10, maxWidth: 300 }}>
            <SalaryInput
              value={other}
              onChange={(val) => dispatch({ type: 'SET_FIELD', field: 'otherCosts', value: val })}
              placeholder="e.g. 20,000"
            />
          </div>
        </div>

        {/* Revenue Pipeline */}
        <div className="card">
          <div className="card-title">Revenue <em>pipeline</em></div>
          <div className="card-mono">Monthly revenue per client with start dates</div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(100px, 1.5fr) 130px 100px 120px 30px', gap: 5,
            marginBottom: 8, padding: '0 0 6px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Client</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right' }}>Monthly</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right' }}>Annual</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Start</span>
            <span></span>
          </div>

          {revenueClientRows.map((row, index) => {
            const amt = parseRaw(row.amount);
            return (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1.5fr) 130px 100px 120px 30px', gap: 5, alignItems: 'center', marginBottom: 5 }}>
                <input type="text" className="ifield" value={row.label || ''} onChange={(e) => updateClient(index, { label: e.target.value })} placeholder="Client name" />
                <SalaryInput value={amt} onChange={(val) => updateClient(index, { amount: val })} placeholder="e.g. 5,000" />
                <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>{amt > 0 ? fmtDollar(amt * 12) : '\u2014'}</span>
                <select className="ifield" value={row.startMonth || ''} onChange={(e) => updateClient(index, { startMonth: e.target.value })} style={{ fontSize: 11, padding: '5px 6px', color: 'var(--green)' }}>
                  <option value="">Start...</option>
                  {monthOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}{opt.isCurrent ? ' \u2190' : ''}</option>
                  ))}
                </select>
                <button className="btn-remove" onClick={() => removeClient(index)} title="Remove">&times;</button>
              </div>
            );
          })}

          <button className="btn-add" onClick={addClient}>+ Add client</button>

          <div className="section-total-row">
            <span className="section-total-label">Monthly Revenue</span>
            <span className="section-total-val" style={{ color: 'var(--green)' }}>{revenue > 0 ? fmtDollar(revenue) : '\u2014'}</span>
          </div>
        </div>

        {/* Committed Capital */}
        <div className="card">
          <div className="card-title">Committed <em>capital</em></div>
          <div className="card-mono">Guaranteed investor funding you can draw at any time — extends runway without inflating cash</div>
          <div style={{ marginTop: 10, maxWidth: 300 }}>
            <SalaryInput
              value={parseRaw(state.committedCapital)}
              onChange={(val) => dispatch({ type: 'SET_FIELD', field: 'committedCapital', value: val })}
              placeholder="e.g. 1,000,000"
            />
          </div>
        </div>
        </>
      )}
    </div>
  );
}
