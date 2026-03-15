import { parseGridNum, parseRaw, fmtDollar } from './formatters';
import { getMonthKeys, getMonthMode } from './monthKeys';

const SALARY_ROW_COUNT = 2;

export function getEffectiveExpTotal(key, actuals, state) {
  const mode = getMonthMode(key, state.actualsCutoffKey);
  const ev = mode === 'estimate' ? getEstimateValues(key, state) : null;
  return (actuals[key]?.expenses||[]).reduce((s,e,i) => {
    const stored = parseGridNum(e.amount);
    if (stored !== 0 || e.amount !== '') return s + stored;
    if (ev && i === 0) return s + ev.salaries;
    if (ev && i === SALARY_ROW_COUNT) return s + ev.other;
    return s;
  }, 0);
}

export function getEffectiveRevenue(key, actuals, state) {
  const mode = getMonthMode(key, state.actualsCutoffKey);
  const rawRev = actuals[key]?.revenue;
  const hasStoredRevenue = rawRev !== undefined && rawRev !== '' && rawRev !== null;
  if (hasStoredRevenue) return parseGridNum(rawRev);
  if (mode === 'estimate') {
    const override = actuals[key]?.revenueOverride;
    if (override !== undefined && override !== '' && override !== null) return parseGridNum(override);
    const clientRev = getClientRevenueForMonth(key, state.revenueClientRows);
    if (clientRev > 0) return clientRev;
    return parseRaw(state.estimatedRevenue);
  }
  return 0;
}

export function computeClose(key, actuals, state) {
  const expTotal = getEffectiveExpTotal(key, actuals, state);
  const rev = getEffectiveRevenue(key, actuals, state);
  const nb = expTotal - rev;
  const rawOpen = actuals[key]?.openingBalance;
  const open = (rawOpen !== '' && rawOpen !== undefined && rawOpen !== null) ? parseGridNum(rawOpen) : null;
  return open !== null ? open - nb : null;
}

export function getEstimateValues(key, state) {
  const { empRows, contractorRows, newHireRows, estimatedRevenue, revenueClientRows } = state;
  const empAnnual = sumEmpAnnual(empRows);
  const ctAnnual = sumContractorAnnual(contractorRows);
  const redAnnual = getCutTotalForMonth(key, empRows, contractorRows);
  const hireAnnual = getHireTotalForMonth(key, newHireRows);
  // Use client pipeline revenue for the given month, fall back to estimatedRevenue
  const clientRev = getClientRevenueForMonth(key, revenueClientRows);
  const revenue = clientRev > 0 ? clientRev : parseRaw(estimatedRevenue);
  const scenarioMonthlyComp = (empAnnual + ctAnnual - redAnnual + hireAnnual) / 12;
  return {
    expenses: scenarioMonthlyComp,
    revenue: revenue,
    salaries: (empAnnual + ctAnnual - redAnnual + hireAnnual) / 12,
    other: 0,
  };
}

export function getClientRevenueForMonth(monthKey, revenueClientRows) {
  if (!revenueClientRows) return 0;
  let total = 0;
  revenueClientRows.forEach(row => {
    const amt = row.amount || 0;
    const start = row.startMonth || '';
    if (amt > 0 && start && monthKey >= start) {
      total += amt;
    }
  });
  return total;
}

export function sumEmpAnnual(empRows) {
  if (!empRows) return 0;
  return empRows.reduce((total, row) => {
    const base = row.base || 0;
    const pct = row.bPct || 0;
    return total + base * (1 + pct/100);
  }, 0);
}

export function sumContractorAnnual(contractorRows) {
  if (!contractorRows) return 0;
  return contractorRows.reduce((total, row) => total + (row.amount || 0), 0);
}

export function getCutTotalForMonth(monthKey, empRows, contractorRows) {
  let total = 0;
  if (empRows) {
    empRows.forEach(row => {
      if (!row.isCut) return;
      const cutMonth = row.effectiveMonth || '';
      if (!cutMonth || cutMonth <= monthKey) {
        total += (row.base || 0) * (1 + (row.bPct || 0)/100);
      }
    });
  }
  if (contractorRows) {
    contractorRows.forEach(row => {
      if (!row.isCut) return;
      const cutMonth = row.effectiveMonth || '';
      if (!cutMonth || cutMonth <= monthKey) {
        total += (row.amount || 0);
      }
    });
  }
  return total;
}

export function getHireTotalForMonth(monthKey, newHireRows) {
  if (!newHireRows) return 0;
  let total = 0;
  newHireRows.forEach(row => {
    const startMonth = row.effectiveMonth || '';
    if (!startMonth || startMonth <= monthKey) {
      total += (row.base || 0) * (1 + (row.bPct || 0)/100);
    }
  });
  return total;
}

export function sumNewHireAnnual(newHireRows) {
  if (!newHireRows) return 0;
  return newHireRows.reduce((total, row) => {
    const base = row.base || 0;
    const pct = row.bPct || 0;
    return total + base * (1 + pct/100);
  }, 0);
}

// Alias used by panel components
export function empRowTotal(row) {
  const base = row.base || 0;
  const pct = row.bPct || 0;
  return base * (1 + pct / 100);
}

export function sumCutSavings(empRows, contractorRows) {
  return getCutTotal(empRows, contractorRows);
}

export function getCutTotal(empRows, contractorRows) {
  let total = 0;
  if (empRows) {
    empRows.forEach(row => {
      if (row.isCut) total += (row.base || 0) * (1 + (row.bPct || 0)/100);
    });
  }
  if (contractorRows) {
    contractorRows.forEach(row => {
      if (row.isCut) total += (row.amount || 0);
    });
  }
  return total;
}
