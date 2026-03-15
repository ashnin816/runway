'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useModel } from '@/context/ModelContext';
import { fmtDollar, fmtGridNum, parseGridNum, parseRaw } from '@/lib/formatters';
import { getMonthKeys, getMonthMode, getCurrentMonthKey, MNAMES } from '@/lib/monthKeys';
import { getEffectiveExpTotal, getEffectiveRevenue, computeClose, getEstimateValues } from '@/lib/calculations';

/* ────────────────────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────────────────────── */
const SALARY_ROW_COUNT = 2;
const COL_WIDTH = 130;
const LABEL_WIDTH = 180;

function addMonths(monthKey, n) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ────────────────────────────────────────────────────────────────────────────
   ensureDefaults — guarantee every month key has an actuals entry
   ──────────────────────────────────────────────────────────────────────────── */
function ensureDefaults(actuals, months, actualsCutoffKey) {
  const result = { ...actuals };
  months.forEach(({ key }) => {
    if (!result[key]) {
      result[key] = {
        mode: key <= actualsCutoffKey ? 'actuals' : 'estimate',
        openingBalance: '',
        expenses: [
          { name: 'Salaries', amount: '', fixed: true },
          { name: 'Benefits', amount: '', fixed: true },
          { name: '', amount: '' },
        ],
        revenue: '',
        notes: '',
      };
    }
  });
  return result;
}

/* ────────────────────────────────────────────────────────────────────────────
   monthHasData — returns true if a month has any user-entered data
   ──────────────────────────────────────────────────────────────────────────── */
function monthHasData(monthEntry) {
  if (!monthEntry) return false;
  if (monthEntry.openingBalance !== '' && monthEntry.openingBalance !== null && monthEntry.openingBalance !== undefined) return true;
  if (monthEntry.revenue !== '' && monthEntry.revenue !== null && monthEntry.revenue !== undefined) return true;
  if (monthEntry.notes && monthEntry.notes.trim() !== '') return true;
  const exps = monthEntry.expenses || [];
  for (let i = 0; i < exps.length; i++) {
    if (exps[i].amount !== '' && exps[i].amount !== null && exps[i].amount !== undefined) {
      const v = parseGridNum(exps[i].amount);
      if (v !== 0) return true;
    }
  }
  return false;
}

/* ────────────────────────────────────────────────────────────────────────────
   GridCell — memoised editable number cell
   Uses defaultValue + imperative updates to avoid cursor-jump issues.
   Only re-renders when value, placeholder, className, or style change.
   ──────────────────────────────────────────────────────────────────────────── */
const GridCell = React.memo(function GridCell({
  value,
  onChange,
  onPaste,
  onKeyDown,
  placeholder,
  className,
  style,
  dataAgrow,
  dataAgcol,
  title,
}) {
  const inputRef = useRef(null);
  const rawRef = useRef(value);

  // Keep rawRef in sync; imperatively update display when not focused
  useEffect(() => {
    rawRef.current = value;
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value =
        value !== '' && value !== null && value !== undefined ? fmtGridNum(value) : '';
    }
  }, [value]);

  const handleFocus = useCallback((e) => {
    const raw = parseFloat((rawRef.current + '').replace(/[^0-9.-]/g, ''));
    e.target.value = isNaN(raw) || !raw || rawRef.current === '' ? '' : raw;
    e.target.select();
  }, []);

  const handleBlur = useCallback(
    (e) => {
      const raw = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''));
      const val = isNaN(raw) ? '' : raw;
      rawRef.current = val;
      e.target.value = val !== '' ? fmtGridNum(val) : '';
      onChange(val);
    },
    [onChange],
  );

  const defaultDisplay =
    value !== '' && value !== null && value !== undefined ? fmtGridNum(value) : '';

  return (
    <input
      ref={inputRef}
      className={`ag-input formatted${className ? ' ' + className : ''}`}
      type="text"
      placeholder={placeholder || '\u2014'}
      defaultValue={defaultDisplay}
      style={style}
      data-agrow={dataAgrow}
      data-agcol={dataAgcol}
      title={title}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPaste={onPaste}
      onKeyDown={onKeyDown}
    />
  );
});

/* ────────────────────────────────────────────────────────────────────────────
   ExpenseRowGroup — expense row + optional salary subtotal
   ──────────────────────────────────────────────────────────────────────────── */
const ExpenseRowGroup = React.memo(function ExpenseRowGroup({
  ei,
  label,
  isFixed,
  isTrailingEmpty,
  months,
  actualsCutoffKey,
  actualsWithCarry,
  bankruptKeys,
  state,
  computedValues,
  onExpenseChange,
  onRenameExpense,
  onDeleteExpense,
  isSalarySubtotalRow,
  onPaste,
  onKeyDown,
}) {
  return (
    <>
      <div className="ag-row ag-exp-row" style={{ display: 'contents' }}>
        {isFixed ? (
          <div
            className="ag-cell ag-row-label"
            style={{ paddingLeft: 20, color: 'var(--muted)', position: 'sticky', left: 0, zIndex: 1 }}
          >
            {label}
          </div>
        ) : (
          <div
            className="ag-cell ag-row-label editable-label"
            style={{ position: 'sticky', left: 0, zIndex: 1, display: 'flex', alignItems: 'center', gap: 4, opacity: isTrailingEmpty ? 0.5 : 1 }}
          >
            <input
              type="text"
              value={label}
              placeholder={isTrailingEmpty ? '+ New expense...' : 'Expense label'}
              style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', font: 'inherit', fontSize: 12, padding: '2px 0', outline: 'none', fontStyle: isTrailingEmpty ? 'italic' : 'normal' }}
              onChange={(e) => onRenameExpense(ei, e.target.value)}
            />
            {!isTrailingEmpty && (
              <button
                className="row-del"
                onClick={() => onDeleteExpense(ei)}
                title="Delete row"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
              >
                &times;
              </button>
            )}
          </div>
        )}
        {months.map(({ key }, mi) => {
          const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
          const exp = (actualsWithCarry[key]?.expenses || [])[ei];
          const raw = exp?.amount ?? '';
          const bk = bankruptKeys.has(key) ? ' ag-bankrupt' : '';
          let placeholder = '\u2014';
          let cellTitle = undefined;
          if (isEst && raw === '') {
            const ev = getEstimateValues(key, state);
            if (ei === 0) {
              placeholder = fmtGridNum(ev.salaries);
              const { empRows = [], contractorRows = [], newHireRows = [] } = state;
              const activeEmp = empRows.filter(r => !r.isCut).length;
              const activeCt = contractorRows.filter(r => !r.isCut).length;
              const hires = newHireRows.length;
              cellTitle = `From Model: ${activeEmp} employees + ${activeCt} contractors` + (hires > 0 ? ` + ${hires} planned hires` : '') + ` = ${fmtGridNum(ev.salaries)}/mo`;
            } else if (ei === SALARY_ROW_COUNT) {
              placeholder = fmtGridNum(ev.other);
              cellTitle = `From Model > Costs: monthly overhead = ${fmtGridNum(ev.other)}/mo`;
            }
          }
          const cellCls = isEst ? 'ag-estimate' : '';
          return (
            <div key={key} className={`ag-cell ${cellCls}${bk}`}>
              <GridCell
                value={raw}
                onChange={(val) => onExpenseChange(key, ei, val)}
                placeholder={placeholder}
                className={isEst ? 'ag-estimate-input' : ''}
                dataAgrow={`exp-${ei}`}
                dataAgcol={mi}
                onPaste={onPaste}
                onKeyDown={onKeyDown}
                title={cellTitle}
              />
            </div>
          );
        })}
      </div>

      {/* Salary subtotal row after Benefits row */}
      {isSalarySubtotalRow && (
        <div className="ag-row ag-subtotal" style={{ display: 'contents' }}>
          <div className="ag-cell ag-row-label" style={{ position: 'sticky', left: 0, zIndex: 1 }}>
            Total Salaries
          </div>
          {months.map(({ key }) => {
            const subTotal = computedValues[key]?.salaryTotal || 0;
            const bk = bankruptKeys.has(key) ? ' ag-bankrupt' : '';
            const cls = subTotal > 0 ? 'ag-neg' : '';
            return (
              <div key={key} className={`ag-cell ag-computed ${cls}${bk}`}>
                {subTotal > 0 ? fmtDollar(subTotal) : '\u2014'}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
});

/* ════════════════════════════════════════════════════════════════════════════
   Actuals — main component
   ════════════════════════════════════════════════════════════════════════════ */
export default function Actuals() {
  const { state, dispatch } = useModel();
  const { actuals } = state;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [cutoffOverride, setCutoffOverride] = useState(null);
  const gridWrapRef = useRef(null);

  /* ── Auto-range: derive grid start/end from data ──────────────────── */
  const { autoStart, autoEnd, autoCutoff } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    // Previous month = default cutoff
    const prevDate = new Date(curYear, curMonth - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // Find earliest and latest months with data
    const dataKeys = Object.keys(actuals).filter(k => monthHasData(actuals[k])).sort();

    let start, end;
    if (dataKeys.length > 0) {
      // Start: 3 months before earliest data, but no later than 3 months before today
      const earliestData = dataKeys[0];
      const threeBeforeNow = new Date(curYear, curMonth - 4, 1);
      const threeBeforeKey = `${threeBeforeNow.getFullYear()}-${String(threeBeforeNow.getMonth() + 1).padStart(2, '0')}`;
      start = earliestData < threeBeforeKey ? earliestData : threeBeforeKey;

      // End: 18 months after latest data, or 18 months from now, whichever is later
      const latestData = dataKeys[dataKeys.length - 1];
      const eighteenFromData = addMonths(latestData, 18);
      const eighteenFromNow = addMonths(curKey, 18);
      end = eighteenFromData > eighteenFromNow ? eighteenFromData : eighteenFromNow;
    } else {
      // No data: 3 months before now → 18 months after now
      const threeBeforeNow = new Date(curYear, curMonth - 4, 1);
      start = `${threeBeforeNow.getFullYear()}-${String(threeBeforeNow.getMonth() + 1).padStart(2, '0')}`;
      end = addMonths(curKey, 18);
    }

    return { autoStart: start, autoEnd: end, autoCutoff: prevKey };
  }, [actuals]);

  const actualsCutoffKey = cutoffOverride || autoCutoff;

  // Sync cutoff to global state so Dashboard/calculations use the same value
  useEffect(() => {
    if (state.actualsCutoffKey !== actualsCutoffKey) {
      dispatch({ type: 'SET_FIELD', field: 'actualsCutoffKey', value: actualsCutoffKey });
    }
  }, [actualsCutoffKey, state.actualsCutoffKey, dispatch]);

  const months = useMemo(
    () => getMonthKeys(autoStart, autoEnd),
    [autoStart, autoEnd],
  );

  /* ── Ensure actuals defaults for all months ─────────────────────────── */
  useEffect(() => {
    const newKeys = months.filter(({ key }) => !actuals[key]);
    if (newKeys.length > 0) {
      const withDefaults = ensureDefaults(actuals, months, actualsCutoffKey);
      dispatch({ type: 'SET_ACTUALS', payload: withDefaults });
    }
  }, [months, actualsCutoffKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Safe actuals (always has defaults) ─────────────────────────────── */
  const safeActuals = useMemo(
    () => ensureDefaults(actuals, months, actualsCutoffKey),
    [actuals, months, actualsCutoffKey],
  );

  /* ── Carry forward opening balances for estimate months ─────────────── */
  const actualsWithCarry = useMemo(() => {
    const result = { ...safeActuals };
    for (let i = 0; i < months.length; i++) {
      const { key } = months[i];
      const mode = getMonthMode(key, actualsCutoffKey);
      if (mode === 'estimate' && i > 0) {
        const prevKey = months[i - 1].key;
        const prevClose = computeClose(prevKey, result, state);
        if (prevClose !== null) {
          result[key] = { ...result[key], openingBalance: prevClose };
        }
      }
    }
    return result;
  }, [safeActuals, months, actualsCutoffKey, state]);

  /* ── Expense labels from first month ────────────────────────────────── */
  const expenseLabels = useMemo(() => {
    if (months.length === 0) return ['Salaries', 'Benefits', ''];
    const firstKey = months[0].key;
    const exps = actualsWithCarry[firstKey]?.expenses || [];
    const labels = exps.map((e) => e.name || '');
    const maxLen = Math.max(
      ...months.map(({ key }) => (actualsWithCarry[key]?.expenses || []).length),
      labels.length,
    );
    while (labels.length < maxLen) labels.push('');
    if (labels.length === 0) return ['Salaries', 'Benefits', ''];
    // Always ensure there's a trailing empty row for auto-expand.
    // A row "has data" if it has a name OR any month has a non-zero amount.
    const lastCustomIdx = labels.length - 1;
    const lastHasName = lastCustomIdx >= SALARY_ROW_COUNT && labels[lastCustomIdx].trim() !== '';
    const lastHasAmount = lastCustomIdx >= SALARY_ROW_COUNT && months.some(({ key }) => {
      const exp = (actualsWithCarry[key]?.expenses || [])[lastCustomIdx];
      return exp && exp.amount !== '' && exp.amount !== undefined && exp.amount !== null && parseGridNum(exp.amount) !== 0;
    });
    if (lastHasName || lastHasAmount || labels.length <= SALARY_ROW_COUNT) {
      labels.push('');
    }
    return labels;
  }, [months, actualsWithCarry]);

  /* ── Bankrupt columns ───────────────────────────────────────────────── */
  const bankruptKeys = useMemo(() => {
    const set = new Set();
    months.forEach(({ key }) => {
      const c = computeClose(key, actualsWithCarry, state);
      if (c !== null && c < 0) set.add(key);
    });
    return set;
  }, [months, actualsWithCarry, state]);

  /* ── Computed values per month ───────────────────────────────────────── */
  const computedValues = useMemo(() => {
    const result = {};
    months.forEach(({ key }) => {
      const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
      const exps = actualsWithCarry[key]?.expenses || [];

      const salaryTotal = exps.slice(0, SALARY_ROW_COUNT).reduce((s, e, i) => {
        const stored = parseGridNum(e.amount);
        if (stored !== 0 || e.amount !== '') return s + stored;
        if (isEst && i === 0) return s + (getEstimateValues(key, state).salaries || 0);
        return s;
      }, 0);

      const expTotal = getEffectiveExpTotal(key, actualsWithCarry, state);
      const rev = getEffectiveRevenue(key, actualsWithCarry, state);
      const netBurn = expTotal - rev;
      const close = computeClose(key, actualsWithCarry, state);

      result[key] = { salaryTotal, expTotal, rev, netBurn, close };
    });
    return result;
  }, [months, actualsWithCarry, actualsCutoffKey, state]);

  /* ── Cash-out info ─────────────────────────────────────────────────── */
  const cashOutInfo = useMemo(() => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const curIdx = months.findIndex(m => m.key === curKey);
    const startIdx = curIdx >= 0 ? curIdx : 0;

    // Find first month where closing balance goes negative
    for (let i = startIdx; i < months.length; i++) {
      const close = computedValues[months[i].key]?.close;
      if (close !== null && close !== undefined && close < 0) {
        const monthsRemaining = i - startIdx;
        return { label: months[i].label, key: months[i].key, monthsRemaining, idx: i };
      }
    }

    // Check if we have any data at all
    const hasAnyClose = months.some(m => {
      const c = computedValues[m.key]?.close;
      return c !== null && c !== undefined;
    });
    if (!hasAnyClose) return null;

    return { label: null, key: null, monthsRemaining: null, idx: null }; // solvent through grid
  }, [months, computedValues]);

  /* ── Estimate breakdown — what feeds the EST columns ──────────────── */
  const estimateBreakdown = useMemo(() => {
    const { empRows = [], contractorRows = [], newHireRows = [], revenueClientRows = [] } = state;
    const empCount = empRows.filter(r => !r.isCut).length;
    const ctCount = contractorRows.filter(r => !r.isCut).length;
    const hireCount = newHireRows.length;
    const cutCount = empRows.filter(r => r.isCut).length + contractorRows.filter(r => r.isCut).length;
    const clientCount = revenueClientRows.filter(r => (r.amount || 0) > 0).length;

    // Use a representative estimate month (first estimate month)
    const firstEstMonth = months.find(m => getMonthMode(m.key, actualsCutoffKey) === 'estimate');
    if (!firstEstMonth) return null;

    const ev = getEstimateValues(firstEstMonth.key, state);

    return {
      salaries: ev.salaries,
      overhead: ev.other,
      revenue: ev.revenue,
      netBurn: ev.salaries + ev.other - ev.revenue,
      empCount,
      ctCount,
      hireCount,
      cutCount,
      clientCount,
    };
  }, [state, months, actualsCutoffKey]);

  /* ── Current month key ──────────────────────────────────────────────── */
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  /* ── Row type list for paste mapping ────────────────────────────────── */
  const rowTypes = useMemo(
    () => ['open', 'revenue', ...expenseLabels.map((_, i) => `exp-${i}`)],
    [expenseLabels],
  );

  /* ── Scroll to current month on mount ───────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      const colIdx = months.findIndex((m) => m.key === currentMonthKey);
      if (colIdx < 0 || !gridWrapRef.current) return;
      const targetX = LABEL_WIDTH + colIdx * COL_WIDTH - gridWrapRef.current.clientWidth / 3;
      gridWrapRef.current.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
    }, 200);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Escape to exit fullscreen ──────────────────────────────────────── */
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  /* ════════════════════════════════════════════════════════════════════════
     Handlers
     ════════════════════════════════════════════════════════════════════════ */

  /* ── Click month header to override cutoff ─────────────────────────── */
  const handleCutoffClick = useCallback(
    (monthKey) => {
      if (cutoffOverride === monthKey) {
        // Clicking the current override clears it (back to auto)
        setCutoffOverride(null);
      } else {
        setCutoffOverride(monthKey);
      }
    },
    [cutoffOverride],
  );

  /* ── Cell-level value changes ───────────────────────────────────────── */
  const handleOpeningBalanceChange = useCallback(
    (key, val) => {
      dispatch({ type: 'SET_ACTUALS_FIELD', monthKey: key, field: 'openingBalance', value: val });
    },
    [dispatch],
  );

  const handleExpenseChange = useCallback(
    (key, expIndex, val) => {
      dispatch({ type: 'SET_ACTUALS_EXPENSE', monthKey: key, expIndex, value: val });
      // Auto-expand: if the user typed into the last custom expense row,
      // ensure a new empty row exists below it across all months
      if (val !== '' && expIndex >= SALARY_ROW_COUNT) {
        const maxExpLen = Math.max(
          ...months.map(({ key: mk }) => (actuals[mk]?.expenses || []).length),
        );
        if (expIndex >= maxExpLen - 1) {
          const newActuals = { ...actuals };
          months.forEach(({ key: mk }) => {
            if (!newActuals[mk]) {
              newActuals[mk] = { openingBalance: '', expenses: [], revenue: '', notes: '' };
            }
            const exps = [...(newActuals[mk].expenses || [])];
            while (exps.length <= expIndex + 1) exps.push({ name: '', amount: '' });
            newActuals[mk] = { ...newActuals[mk], expenses: exps };
          });
          dispatch({ type: 'SET_ACTUALS', payload: newActuals });
        }
      }
    },
    [dispatch, actuals, months],
  );

  const handleRevenueChange = useCallback(
    (key, val) => {
      dispatch({ type: 'SET_ACTUALS_FIELD', monthKey: key, field: 'revenue', value: val });
    },
    [dispatch],
  );


  /* ── Rename expense row ─────────────────────────────────────────────── */
  const handleRenameExpense = useCallback(
    (idx, newName) => {
      if (idx < SALARY_ROW_COUNT) return;
      const newActuals = { ...actuals };
      months.forEach(({ key }) => {
        if (!newActuals[key]) return;
        const exps = [...(newActuals[key].expenses || [])];
        while (exps.length <= idx) exps.push({ name: '', amount: '' });
        exps[idx] = { ...exps[idx], name: newName };
        newActuals[key] = { ...newActuals[key], expenses: exps };
      });
      dispatch({ type: 'SET_ACTUALS', payload: newActuals });
    },
    [actuals, months, dispatch],
  );

  /* ── Delete expense row ─────────────────────────────────────────────── */
  const handleDeleteExpense = useCallback(
    (idx) => {
      if (idx < SALARY_ROW_COUNT) return;
      const name = expenseLabels[idx] || 'this expense row';
      if (!window.confirm(`Are you sure you want to delete the "${name}" row across all months?`)) return;
      const newActuals = { ...actuals };
      months.forEach(({ key }) => {
        if (newActuals[key]?.expenses) {
          const exps = [...newActuals[key].expenses];
          exps.splice(idx, 1);
          newActuals[key] = { ...newActuals[key], expenses: exps };
        }
      });
      dispatch({ type: 'SET_ACTUALS', payload: newActuals });
    },
    [actuals, months, dispatch, expenseLabels],
  );

  /* ── Clear all data ─────────────────────────────────────────────────── */
  const handleClearAll = useCallback(() => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    dispatch({ type: 'SET_ACTUALS', payload: {} });
    setClearConfirm(false);
  }, [clearConfirm, dispatch]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  /* ── Multi-cell paste handler ───────────────────────────────────────── */
  const handlePaste = useCallback(
    (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;

      const rows = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trimEnd()
        .split('\n');
      const grid = rows.map((r) => r.split('\t'));

      // Single value: let default paste behavior happen
      if (!grid.length || !grid[0].length) return;
      if (grid.length === 1 && grid[0].length === 1) return;

      e.preventDefault();

      const startInput = e.target;
      const startRow = startInput.dataset?.agrow;
      const startCol = parseInt(startInput.dataset?.agcol, 10);
      if (!startRow || isNaN(startCol)) return;

      const startRowIdx = rowTypes.indexOf(startRow);
      if (startRowIdx === -1) return;

      const newActuals = { ...actuals };
      const flashTargets = [];

      grid.forEach((pasteRow, ri) => {
        const targetRowIdx = startRowIdx + ri;
        if (targetRowIdx >= rowTypes.length) return;
        const rowType = rowTypes[targetRowIdx];

        pasteRow.forEach((cellVal, ci) => {
          const targetColIdx = startCol + ci;
          if (targetColIdx >= months.length) return;

          const { key } = months[targetColIdx];
          if (getMonthMode(key, actualsCutoffKey) === 'estimate') return;

          const cleaned = cellVal.replace(/[$,\s]/g, '').trim();
          const num = parseFloat(cleaned);
          const val = isNaN(num) ? '' : num;

          // Ensure month entry exists
          if (!newActuals[key]) {
            newActuals[key] = { openingBalance: '', expenses: [], revenue: '', notes: '' };
          } else {
            newActuals[key] = { ...newActuals[key] };
          }

          if (rowType === 'open') {
            newActuals[key].openingBalance = val;
          } else if (rowType === 'revenue') {
            newActuals[key].revenue = val;
          } else if (rowType.startsWith('exp-')) {
            const expIdx = parseInt(rowType.split('-')[1], 10);
            const exps = [...(newActuals[key].expenses || [])];
            while (exps.length <= expIdx) exps.push({ name: '', amount: '' });
            exps[expIdx] = { ...exps[expIdx], amount: val };
            newActuals[key].expenses = exps;
          }

          flashTargets.push({ rowType, colIdx: targetColIdx });
        });
      });

      // Batch dispatch
      dispatch({ type: 'SET_ACTUALS', payload: newActuals });

      // Paste flash animation
      requestAnimationFrame(() => {
        flashTargets.forEach(({ rowType, colIdx }) => {
          const selector = `[data-agrow="${rowType}"][data-agcol="${colIdx}"]`;
          const el = document.querySelector(selector);
          if (el) {
            const cell = el.closest('.ag-cell');
            if (cell) {
              cell.classList.add('paste-flash');
              setTimeout(() => cell.classList.remove('paste-flash'), 600);
            }
          }
        });
      });
    },
    [actuals, months, actualsCutoffKey, rowTypes, dispatch],
  );

  /* ── Keyboard navigation ────────────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e) => {
      const input = e.target;
      const row = input.dataset?.agrow;
      const col = parseInt(input.dataset?.agcol, 10);
      if (!row || isNaN(col)) return;

      const rowIdx = rowTypes.indexOf(row);

      if (e.key === 'Tab') {
        e.preventDefault();
        const nextCol = e.shiftKey ? col - 1 : col + 1;
        if (nextCol >= 0 && nextCol < months.length) {
          const next = document.querySelector(`[data-agrow="${row}"][data-agcol="${nextCol}"]`);
          if (next) {
            input.blur();
            next.focus();
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const nextRowIdx = e.shiftKey ? rowIdx - 1 : rowIdx + 1;
        if (nextRowIdx >= 0 && nextRowIdx < rowTypes.length) {
          const nextRow = rowTypes[nextRowIdx];
          const next = document.querySelector(`[data-agrow="${nextRow}"][data-agcol="${col}"]`);
          if (next) {
            input.blur();
            next.focus();
          }
        }
      } else if (e.key === 'Escape') {
        input.blur();
      }
    },
    [rowTypes, months.length],
  );

  /* ── Grid dimensions ────────────────────────────────────────────────── */
  const colTemplate = `${LABEL_WIDTH}px repeat(${months.length}, ${COL_WIDTH}px)`;
  const gridMinWidth = LABEL_WIDTH + months.length * COL_WIDTH;
  const cardClass = isFullscreen ? 'card actuals-fullscreen' : 'card';

  /* ════════════════════════════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div id="actuals" className="panel active">
      {/* ── Paste flash CSS ─────────────────────────────────────────────── */}
      <style>{`.paste-flash { animation: pasteFlash 0.6s ease; }
.ag-current-month { border-bottom: 2px solid var(--blue, #2563eb) !important; }
.ag-head .ag-cell[style*="cursor: pointer"]:hover { opacity: 0.8; }`}</style>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div
        className="card fs-normal-header"
        style={{ paddingBottom: 14, display: isFullscreen ? 'none' : undefined }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div className="card-title" style={{ marginBottom: 6 }}>
              Monthly <em>actuals tracker</em>
            </div>
            <p style={{ margin: 0, fontSize: 13 }}>
              Enter values directly in the grid. Past months show actuals, future months show estimates from your model.
            </p>
            {cutoffOverride && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '.06em' }}>
                  Actuals through: <strong style={{ color: 'var(--text)' }}>{months.find(m => m.key === cutoffOverride)?.label || cutoffOverride}</strong>
                </span>
                <button
                  onClick={() => setCutoffOverride(null)}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    cursor: 'pointer', fontSize: 10, color: 'var(--muted)', padding: '2px 8px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Reset to auto
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn-fullscreen"
              onClick={handleClearAll}
              style={{
                color: 'var(--red)',
                borderColor: 'rgba(220,38,38,.18)',
                background: 'rgba(220,38,38,.06)',
              }}
            >
              {clearConfirm ? 'Click again to confirm' : '\u2715 Clear All Data'}
            </button>
            <button className="btn-fullscreen" onClick={toggleFullscreen}>
              {isFullscreen ? '\u2715 Exit Full Screen' : '\u26F6 Full Screen'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Estimate breakdown ──────────────────────────────────────────── */}
      {estimateBreakdown && !isFullscreen && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          marginBottom: 8,
          borderRadius: 8,
          background: 'rgba(180,120,0,.04)',
          border: '1px solid rgba(180,120,0,.12)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--muted)',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 9, marginRight: 4 }}>EST</span>
          <span>
            <strong style={{ color: 'var(--text)' }}>{fmtDollar(estimateBreakdown.salaries)}</strong>
            <span style={{ fontSize: 10 }}> salaries</span>
            <span style={{ color: 'var(--border)', margin: '0 2px' }}>(</span>
            <span style={{ fontSize: 10 }}>{estimateBreakdown.empCount} emp</span>
            {estimateBreakdown.ctCount > 0 && <span style={{ fontSize: 10 }}> + {estimateBreakdown.ctCount} ctr</span>}
            {estimateBreakdown.hireCount > 0 && <span style={{ fontSize: 10, color: 'var(--green)' }}> + {estimateBreakdown.hireCount} hire</span>}
            {estimateBreakdown.cutCount > 0 && <span style={{ fontSize: 10, color: 'var(--red)' }}> − {estimateBreakdown.cutCount} cut</span>}
            <span style={{ color: 'var(--border)' }}>)</span>
          </span>
          <span style={{ color: 'var(--border)' }}>+</span>
          <span>
            <strong style={{ color: 'var(--text)' }}>{fmtDollar(estimateBreakdown.overhead)}</strong>
            <span style={{ fontSize: 10 }}> overhead</span>
          </span>
          <span style={{ color: 'var(--border)' }}>−</span>
          <span>
            <strong style={{ color: 'var(--green)' }}>{fmtDollar(estimateBreakdown.revenue)}</strong>
            <span style={{ fontSize: 10 }}> revenue</span>
            {estimateBreakdown.clientCount > 0 && <span style={{ fontSize: 10 }}> ({estimateBreakdown.clientCount} client{estimateBreakdown.clientCount !== 1 ? 's' : ''})</span>}
          </span>
          <span style={{ color: 'var(--border)' }}>=</span>
          <span>
            <strong style={{ color: estimateBreakdown.netBurn > 0 ? 'var(--red)' : 'var(--green)' }}>{fmtDollar(estimateBreakdown.netBurn)}</strong>
            <span style={{ fontSize: 10 }}>/mo net burn</span>
          </span>
        </div>
      )}

      {/* ── Cash-out callout ────────────────────────────────────────────── */}
      {cashOutInfo && !isFullscreen && (() => {
        if (cashOutInfo.label) {
          // Cash runs out
          const mo = cashOutInfo.monthsRemaining;
          const color = mo < 6 ? '#ef4444' : mo < 12 ? '#f59e0b' : '#22c55e';
          const bgColor = mo < 6 ? 'rgba(239,68,68,.06)' : mo < 12 ? 'rgba(245,158,11,.06)' : 'rgba(34,197,94,.06)';
          const borderColor = mo < 6 ? 'rgba(239,68,68,.2)' : mo < 12 ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.2)';
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                marginBottom: 16,
                borderRadius: 8,
                background: bgColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color,
                fontWeight: 600,
                letterSpacing: '.02em',
              }}>
                Cash runs out {cashOutInfo.label} — {mo} month{mo !== 1 ? 's' : ''} remaining
              </span>
              <button
                onClick={() => {
                  if (!gridWrapRef.current || cashOutInfo.idx == null) return;
                  const targetX = LABEL_WIDTH + cashOutInfo.idx * COL_WIDTH - gridWrapRef.current.clientWidth / 3;
                  gridWrapRef.current.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
                }}
                style={{
                  background: 'none',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color,
                  padding: '3px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                Scroll to {cashOutInfo.label} →
              </button>
            </div>
          );
        } else {
          // Solvent through entire grid
          return (
            <div
              style={{
                padding: '10px 18px',
                marginBottom: 16,
                borderRadius: 8,
                background: 'rgba(34,197,94,.06)',
                border: '1px solid rgba(34,197,94,.2)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: '#22c55e',
                fontWeight: 600,
                letterSpacing: '.02em',
              }}
            >
              Cash positive through the entire projection
            </div>
          );
        }
      })()}

      {/* ── Grid card ───────────────────────────────────────────────────── */}
      <div className={cardClass} style={{ padding: 0, overflow: 'hidden' }}>
        {/* Fullscreen top bar */}
        {isFullscreen && (
          <div
            className="fs-topbar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: 'var(--accent)',
                letterSpacing: '.08em',
              }}
            >
              ACTUALS TRACKER
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-fullscreen" onClick={toggleFullscreen}>
                {'\u2715'} Exit Full Screen
              </button>
            </div>
          </div>
        )}

        <div className="actuals-grid-wrap" ref={gridWrapRef}>
          <div
            className="actuals-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              minWidth: gridMinWidth,
            }}
          >
            {/* ── Header row ────────────────────────────────────────────── */}
            <div className="ag-row ag-head" style={{ display: 'contents' }}>
              <div
                className="ag-cell ag-row-label"
                style={{ position: 'sticky', top: 0, left: 0, zIndex: 4 }}
              >
                Row
              </div>
              {months.map(({ key, label }, mi) => {
                const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
                const bk = bankruptKeys.has(key) ? ' ag-bankrupt' : '';
                const isCurrent = key === currentMonthKey ? ' ag-current-month' : '';
                // Show a divider on the first estimate column
                const isFirstEst = isEst && mi > 0 && getMonthMode(months[mi - 1].key, actualsCutoffKey) === 'actuals';
                return (
                  <div
                    key={key}
                    className={`ag-cell${isEst ? ' ag-estimate-head' : ''}${bk}${isCurrent}`}
                    style={{
                      flexDirection: 'column',
                      gap: 2,
                      padding: '6px 6px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderLeft: isFirstEst ? '2px solid var(--accent)' : undefined,
                    }}
                    onClick={() => handleCutoffClick(key)}
                    title={isEst ? `Click to mark actuals through ${label}` : `Click to set estimate from ${label}`}
                  >
                    <span style={{ fontSize: 9, letterSpacing: '.07em' }}>{label}</span>
                    {isEst && <span className="ag-est-badge">EST</span>}
                  </div>
                );
              })}
            </div>

            {/* ── Opening Cash Balance ───────────────────────────────────── */}
            <div className="ag-row" style={{ display: 'contents' }}>
              <div
                className="ag-cell ag-row-label"
                style={{
                  color: 'var(--blue)',
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}
              >
                Opening Cash Balance
              </div>
              {months.map(({ key }, mi) => {
                const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
                const raw = actualsWithCarry[key]?.openingBalance ?? '';
                const bk = bankruptKeys.has(key) ? ' ag-bankrupt' : '';

                if (isEst) {
                  const display =
                    raw !== '' && raw !== null && raw !== undefined
                      ? fmtDollar(parseGridNum(raw))
                      : '\u2014';
                  return (
                    <div key={key} className={`ag-cell ag-estimate ag-computed ag-gold${bk}`}>
                      {display}
                    </div>
                  );
                }
                return (
                  <div key={key} className={`ag-cell${bk}`}>
                    <GridCell
                      value={raw}
                      onChange={(val) => handleOpeningBalanceChange(key, val)}
                      dataAgrow="open"
                      dataAgcol={mi}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── Revenue / Inflows ──────────────────────────────────────── */}
            <div className="ag-row" style={{ display: 'contents' }}>
              <div
                className="ag-cell ag-row-label"
                style={{
                  color: 'var(--green)',
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}
              >
                Revenue / Inflows
              </div>
              {months.map(({ key }, mi) => {
                const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
                const bk = bankruptKeys.has(key) ? ' ag-bankrupt' : '';
                const raw = actualsWithCarry[key]?.revenue ?? '';

                if (isEst) {
                  const ev = getEstimateValues(key, state);
                  const estRev = ev.revenue || 0;
                  const clientCount = (state.revenueClientRows || []).filter(c => (c.amount || 0) > 0).length;
                  const revTitle = estRev > 0
                    ? `From Model > Revenue: ${clientCount} client${clientCount !== 1 ? 's' : ''} = ${fmtGridNum(estRev)}/mo`
                    : undefined;
                  return (
                    <div key={key} className={`ag-cell ag-estimate${bk}`}>
                      <GridCell
                        value={raw !== '' ? raw : ''}
                        onChange={(val) => handleRevenueChange(key, val)}
                        placeholder={estRev > 0 ? fmtGridNum(estRev) : '\u2014'}
                        className="ag-estimate-input"
                        style={{ color: 'var(--green)' }}
                        dataAgrow="revenue"
                        dataAgcol={mi}
                        onPaste={handlePaste}
                        onKeyDown={handleKeyDown}
                        title={revTitle}
                      />
                    </div>
                  );
                }

                return (
                  <div key={key} className={`ag-cell${bk}`}>
                    <GridCell
                      value={raw}
                      onChange={(val) => handleRevenueChange(key, val)}
                      style={{ color: 'var(--green)' }}
                      dataAgrow="revenue"
                      dataAgcol={mi}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── Expenses section header ──────────────────────────────── */}
            <div className="ag-row ag-section-head" style={{ display: 'contents' }}>
              <div
                className="ag-cell ag-row-label"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--red)',
                  background: 'var(--surface2)',
                }}
              >
                Expenses
              </div>
              {months.map(({ key }) => (
                <div key={key} className="ag-cell" style={{ background: 'var(--surface2)', minHeight: 28 }} />
              ))}
            </div>

            {/* ── Expense rows ──────────────────────────────────────────── */}
            {expenseLabels.map((lbl, ei) => {
              const isFixed = ei < SALARY_ROW_COUNT;
              const isTrailingEmpty = !isFixed && ei === expenseLabels.length - 1 && lbl.trim() === '';
              return (
                <ExpenseRowGroup
                  key={ei}
                  ei={ei}
                  label={lbl}
                  isFixed={isFixed}
                  isTrailingEmpty={isTrailingEmpty}
                  months={months}
                  actualsCutoffKey={actualsCutoffKey}
                  actualsWithCarry={actualsWithCarry}
                  bankruptKeys={bankruptKeys}
                  state={state}
                  computedValues={computedValues}
                  onExpenseChange={handleExpenseChange}
                  onRenameExpense={handleRenameExpense}
                  onDeleteExpense={handleDeleteExpense}
                  isSalarySubtotalRow={ei === SALARY_ROW_COUNT - 1}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                />
              );
            })}

            {/* ── Total Expenses ─────────────────────────────────────────── */}
            <div className="ag-row" style={{ display: 'contents' }}>
              <div
                className="ag-cell ag-row-label"
                style={{
                  color: 'var(--red)',
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}
              >
                Total Expenses
              </div>
              {months.map(({ key }) => {
                const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
                const total = computedValues[key]?.expTotal || 0;
                const cls = total > 0 ? (isEst ? 'ag-neg ag-estimate' : 'ag-neg') : '';
                const bk = bankruptKeys.has(key) ? ' ag-bankrupt' : '';
                return (
                  <div key={key} className={`ag-cell ag-computed ${cls}${bk}`}>
                    {total > 0 ? fmtDollar(total) : '\u2014'}
                  </div>
                );
              })}
            </div>

            {/* ── Closing Cash Balance ───────────────────────────────────── */}
            <div className="ag-row" style={{ display: 'contents' }}>
              <div
                className="ag-cell ag-row-label"
                style={{
                  color: 'var(--accent)',
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}
              >
                Closing Cash Balance
              </div>
              {months.map(({ key }) => {
                const close = computedValues[key]?.close;
                const isEst = getMonthMode(key, actualsCutoffKey) === 'estimate';
                const cls =
                  close === null || close === undefined
                    ? ''
                    : close < 0
                      ? 'ag-neg'
                      : 'ag-gold';
                const bk = bankruptKeys.has(key) ? ' ag-bankrupt-close' : '';
                return (
                  <div
                    key={key}
                    className={`ag-cell ag-computed ${cls} ${isEst ? 'ag-estimate' : ''}${bk}`}
                  >
                    {close !== null && close !== undefined ? fmtDollar(close) : '\u2014'}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
