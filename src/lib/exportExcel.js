import { parseGridNum } from '@/lib/formatters';
import { getMonthKeys, getMonthMode } from '@/lib/monthKeys';

const SALARY_ROW_COUNT = 2;

export async function exportExcel(state) {
  const XLSX = (await import('xlsx-js-style')).default;

  try {
    const wb = XLSX.utils.book_new();
    const months = getMonthKeys(state.gridStartKey, state.gridEndKey);
    const actuals = state.actuals || {};
    const R = (r, c) => XLSX.utils.encode_cell({ r, c });
    const numFmt = '#,##0';
    const pctFmt = '0.0%';

    // ── Color palette ──
    const gFill = { fgColor: { rgb: 'E2EFDA' } };
    const blueFill = { fgColor: { rgb: 'D6E4F0' } };
    const headerFill = { fgColor: { rgb: '1E2230' } };
    const sectionFill = { fgColor: { rgb: 'F2F2F2' } };
    const inputFill = { fgColor: { rgb: 'FFFFCC' } };

    // ── Style library ──
    const sInput = { font: { color: { rgb: '0000FF' } }, fill: inputFill, numFmt };
    const sInputPct = { font: { color: { rgb: '0000FF' } }, fill: inputFill, numFmt: pctFmt };
    const sInputText = { font: { color: { rgb: '0000FF' } }, fill: inputFill };
    const sFormula = { font: { color: { rgb: '000000' } }, numFmt };
    const sFormulaGreen = { font: { color: { rgb: '008000' } }, numFmt };
    const sHeader = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: headerFill };
    const sSection = { font: { bold: true, sz: 11 }, fill: sectionFill };
    const sLabel = { font: { bold: false } };
    const sLabelBold = { font: { bold: true } };
    const sBold = { font: { bold: true }, numFmt };
    const sBoldUl = { font: { bold: true }, numFmt, border: { bottom: { style: 'thin', color: { rgb: '000000' } } } };
    const sBoldDbl = { font: { bold: true }, numFmt, border: { bottom: { style: 'double', color: { rgb: '000000' } } } };
    const sNormal = { numFmt };
    const sNormalG = { numFmt, fill: gFill };
    const sBoldG = { font: { bold: true }, numFmt, fill: gFill };
    const sBoldUlG = { font: { bold: true }, numFmt, fill: gFill, border: { bottom: { style: 'thin', color: { rgb: '000000' } } } };
    const sBoldDblG = { font: { bold: true }, numFmt, fill: gFill, border: { bottom: { style: 'double', color: { rgb: '000000' } } } };
    const sHeaderG = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '548235' } } };
    const sTextG = { fill: gFill };
    const sText = {};

    // ═══════════════════════════════════════════
    // ASSUMPTIONS SHEET
    // ═══════════════════════════════════════════
    const as = {};
    const asc = (r, c, v, style) => { as[R(r, c)] = { v, t: 's', s: style || sLabel }; };
    const asn = (r, c, v, style) => { as[R(r, c)] = { v, t: 'n', z: numFmt, s: style || sNormal }; };
    const aspct = (r, c, v, style) => { as[R(r, c)] = { v: v / 100, t: 'n', z: pctFmt, s: style || sNormal }; };
    const asf = (r, c, formula, style) => { as[R(r, c)] = { f: formula.replace(/^=/, ''), z: numFmt, s: style || sFormula }; };

    // Cross-sheet reference helper
    const aRef = (r, c) => `Assumptions!${XLSX.utils.encode_cell({ r, c })}`;

    // Row 0: Title
    asc(0, 0, 'Runway Financial Model \u2014 Assumptions', sHeader);
    for (let c = 1; c <= 7; c++) asc(0, c, '', sHeader);

    // Row 2: Global Settings section
    asc(2, 0, 'GLOBAL SETTINGS', sSection);
    for (let c = 1; c <= 7; c++) asc(2, c, '', sSection);

    // Row 3: Bank Balance
    asc(3, 0, 'Starting Bank Balance', sLabelBold);
    const bankVal = parseFloat(state.bankBalance) || 0;
    asn(3, 1, bankVal, sInput);

    // Row 4: (reserved — overhead removed)
    asc(4, 0, '', sLabel);

    // Row 5: Estimated Monthly Revenue
    asc(5, 0, 'Monthly Revenue (Est.)', sLabelBold);
    const revVal = parseFloat(state.estimatedRevenue) || 0;
    asn(5, 1, revVal, sInput);

    // Row 6: Master Benefits %
    asc(6, 0, 'Default Benefits %', sLabelBold);
    const bpct = parseFloat(state.masterBenefitsPct) || 22;
    aspct(6, 1, bpct, sInputPct);

    // ── People Table ──
    // Collect all people into a unified list
    const people = [];
    const empRows = state.empRows || [];
    empRows.forEach((emp, i) => {
      people.push({
        type: 'Employee',
        name: emp.label || `Employee ${i + 1}`,
        annualComp: emp.base || 0,
        benefitsPct: emp.bPct || 0,
        startMonth: emp.effectiveMonth || '',
        endMonth: emp.isCut ? (emp.effectiveMonth || '') : '',
        isCut: !!emp.isCut,
      });
    });
    const ctRows = state.contractorRows || [];
    ctRows.forEach((ct, i) => {
      people.push({
        type: 'Contractor',
        name: ct.label || `Contractor ${i + 1}`,
        annualComp: ct.amount || 0,
        benefitsPct: 0,
        startMonth: ct.effectiveMonth || '',
        endMonth: ct.isCut ? (ct.effectiveMonth || '') : '',
        isCut: !!ct.isCut,
      });
    });
    const nhRows = state.newHireRows || [];
    nhRows.forEach((nh, i) => {
      people.push({
        type: 'New Hire',
        name: nh.label || `New Hire ${i + 1}`,
        annualComp: nh.base || 0,
        benefitsPct: nh.bPct || 0,
        startMonth: nh.effectiveMonth || '',
        endMonth: '',
        isCut: false,
      });
    });

    // Row 8: People table header
    const PT_START = 8;
    asc(PT_START, 0, 'TEAM ROSTER', sSection);
    for (let c = 1; c <= 7; c++) asc(PT_START, c, '', sSection);

    const ptHeaderRow = PT_START + 1;
    const ptHeaders = ['Name', 'Type', 'Annual Comp', 'Benefits %', 'Monthly Total', 'Start Month', 'End Month', 'Status'];
    ptHeaders.forEach((h, c) => asc(ptHeaderRow, c, h, sLabelBold));

    const ptDataStart = PT_START + 2;
    people.forEach((p, i) => {
      const row = ptDataStart + i;
      asc(row, 0, p.name, sInputText);
      asc(row, 1, p.type, sInputText);
      asn(row, 2, p.annualComp, sInput);
      aspct(row, 3, p.benefitsPct, sInputPct);
      asf(row, 4, `=(${R(row, 2)}+${R(row, 2)}*${R(row, 3)})/12`, sFormulaGreen);
      asc(row, 5, p.startMonth, sInputText);
      asc(row, 6, p.endMonth, sInputText);
      asc(row, 7, p.isCut ? 'CUT' : 'Active', p.isCut
        ? { font: { bold: true, color: { rgb: 'FF0000' } }, fill: inputFill }
        : { font: { bold: true, color: { rgb: '008000' } }, fill: inputFill });
    });

    // Totals row below people
    const ptTotalRow = ptDataStart + people.length;
    asc(ptTotalRow, 0, 'Total Monthly Payroll', sLabelBold);
    if (people.length > 0) {
      asf(ptTotalRow, 4, `=SUM(${R(ptDataStart, 4)}:${R(ptDataStart + people.length - 1, 4)})`, sBoldUl);
    } else {
      asn(ptTotalRow, 4, 0, sBoldUl);
    }

    // ── Monthly Projections Grid on Assumptions ──
    const mpRow = ptTotalRow + 2;
    asc(mpRow, 0, 'MONTHLY PROJECTIONS', sSection);
    for (let c = 1; c <= months.length; c++) asc(mpRow, c, '', sSection);

    const mpMonthRow = mpRow + 1;
    const mpSalRow = mpRow + 2;
    const mpOvhRow = mpRow + 3;
    const mpRevRow = mpRow + 4;

    asc(mpSalRow, 0, 'Salaries', sLabelBold);
    asc(mpOvhRow, 0, 'Overhead', sLabelBold);
    asc(mpRevRow, 0, 'Revenue', sLabelBold);

    // People ranges for SUMPRODUCT
    const hasPeople = people.length > 0;
    const startRange = hasPeople ? `${aRef(ptDataStart, 5)}:${aRef(ptDataStart + people.length - 1, 5)}` : '';
    const endRange = hasPeople ? `${aRef(ptDataStart, 6)}:${aRef(ptDataStart + people.length - 1, 6)}` : '';
    const monthlyRange = hasPeople ? `${aRef(ptDataStart, 4)}:${aRef(ptDataStart + people.length - 1, 4)}` : '';

    months.forEach(({ key, label }, mi) => {
      const col = 1 + mi;
      asc(mpMonthRow, col, label, sLabelBold);

      if (hasPeople) {
        const statusRange = `${aRef(ptDataStart, 7)}:${aRef(ptDataStart + people.length - 1, 7)}`;
        const salFormula = `=SUMPRODUCT(((${startRange}<="${key}")+(${startRange}="")>0)*((${endRange}>"${key}")+(${endRange}="")>0)*(${statusRange}="Active")*${monthlyRange})`;
        asf(mpSalRow, col, salFormula, sFormulaGreen);
      } else {
        asn(mpSalRow, col, 0, sFormulaGreen);
      }

      asf(mpOvhRow, col, `=${R(4, 1)}`, sFormulaGreen);
      asf(mpRevRow, col, `=${R(5, 1)}`, sFormulaGreen);
    });

    // Set range and column widths for Assumptions
    const asMaxRow = mpRevRow + 1;
    const asMaxCol = Math.max(7, months.length);
    as['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: asMaxRow, c: asMaxCol } });
    as['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, as, 'Assumptions');

    // ═══════════════════════════════════════════
    // ACTUALS SHEET (formulas reference Assumptions)
    // ═══════════════════════════════════════════
    const ws = {};
    const sc = (r, c, v, style) => { ws[R(r, c)] = { v, t: 's', s: style || sText }; };
    const sn = (r, c, v, style) => { ws[R(r, c)] = { v, t: 'n', z: numFmt, s: style || sNormal }; };
    const sf = (r, c, formula, style) => { ws[R(r, c)] = { f: formula.replace(/^=/, ''), z: numFmt, s: style || sFormula }; };

    // Collect all expense labels across months
    const allExpLabels = [];
    months.forEach(({ key }) => {
      (actuals[key]?.expenses || []).forEach((e, i) => {
        if (!allExpLabels[i]) allExpLabels[i] = e.name || `Expense ${i + 1}`;
      });
    });
    const numExps = allExpLabels.length;

    // Row layout
    const ROW_HEADER = 0;
    const ROW_MODE = 1;
    const ROW_OPEN = 2;
    const ROW_EXPS = 3;
    const ROW_SAL_TOT = ROW_EXPS + SALARY_ROW_COUNT;
    const ROW_OTHER_START = ROW_SAL_TOT + 1;
    const numOther = numExps - SALARY_ROW_COUNT;
    const ROW_TOT_EXP = ROW_OTHER_START + Math.max(numOther, 0);
    const ROW_REVENUE = ROW_TOT_EXP + 1;
    const ROW_NET_BURN = ROW_REVENUE + 1;
    const ROW_CLOSING = ROW_NET_BURN + 1;
    const ROW_NOTES = ROW_CLOSING + 1;
    const TOTAL_ROWS = ROW_NOTES + 1;
    const COL_OFFSET = 1;

    // Row labels
    sc(ROW_HEADER, 0, 'Runway Financial Model \u2014 Actuals', sHeader);
    sc(ROW_MODE, 0, 'Mode');
    sc(ROW_OPEN, 0, 'Opening Cash Balance', sLabelBold);
    for (let i = 0; i < SALARY_ROW_COUNT; i++) {
      sc(ROW_EXPS + i, 0, allExpLabels[i] || `Expense ${i + 1}`);
    }
    sc(ROW_SAL_TOT, 0, 'Total Salaries', sLabelBold);
    for (let i = SALARY_ROW_COUNT; i < numExps; i++) {
      sc(ROW_OTHER_START + (i - SALARY_ROW_COUNT), 0, allExpLabels[i] || `Expense ${i + 1}`);
    }
    sc(ROW_TOT_EXP, 0, 'Total Expenses (Salaries + Other)', sLabelBold);
    sc(ROW_REVENUE, 0, 'Revenue / Inflows', sLabelBold);
    sc(ROW_NET_BURN, 0, 'Net Burn', sLabelBold);
    sc(ROW_CLOSING, 0, 'Closing Cash Balance', sLabelBold);
    sc(ROW_NOTES, 0, 'Notes');

    // Per-month columns
    months.forEach(({ key, label }, mi) => {
      const col = COL_OFFSET + mi;
      const act = actuals[key] || {};
      const mode = getMonthMode(key, state.actualsCutoffKey);
      const isEst = mode === 'estimate';
      const isAct = !isEst;
      const exps = act.expenses || [];

      // Style sets
      const _n = isAct ? sNormalG : sNormal;
      const _b = isAct ? sBoldG : sBold;
      const _bu = isAct ? sBoldUlG : sBoldUl;
      const _bd = isAct ? sBoldDblG : sBoldDbl;
      const _h = isAct ? sHeaderG : sHeader;
      const _t = isAct ? sTextG : sText;

      // Header
      sc(ROW_HEADER, col, label, _h);
      sc(ROW_MODE, col, isEst ? 'ESTIMATE' : 'ACTUALS', _t);

      // Opening Cash Balance
      const openRaw = act.openingBalance;
      const openVal = (openRaw !== '' && openRaw !== undefined && openRaw !== null) ? parseGridNum(openRaw) : null;
      if (mi === 0) {
        if (openVal !== null) sn(ROW_OPEN, col, openVal, _b);
        else sf(ROW_OPEN, col, `=${aRef(3, 1)}`, { font: { bold: true, color: { rgb: '008000' } }, numFmt, fill: isAct ? gFill : undefined });
      } else {
        sf(ROW_OPEN, col, `=IF(${R(ROW_CLOSING, col - 1)}="",0,${R(ROW_CLOSING, col - 1)})`, _b);
      }

      // For ESTIMATE months, reference Assumptions monthly projections
      if (isEst) {
        const asSalCol = 1 + mi;
        sf(ROW_EXPS, col, `=${aRef(mpSalRow, asSalCol)}`, { font: { color: { rgb: '008000' } }, numFmt, fill: isAct ? gFill : undefined });

        for (let ei = 1; ei < SALARY_ROW_COUNT; ei++) {
          const exp = exps[ei];
          const stored = (exp?.amount !== '' && exp?.amount !== undefined) ? parseGridNum(exp.amount) : null;
          sn(ROW_EXPS + ei, col, (stored !== null && stored !== 0) ? stored : 0, _n);
        }

        if (numOther > 0) {
          const ovhRow = ROW_OTHER_START;
          const exp0 = exps[SALARY_ROW_COUNT];
          const stored0 = (exp0?.amount !== '' && exp0?.amount !== undefined) ? parseGridNum(exp0.amount) : null;
          if (stored0 !== null && stored0 !== 0) {
            sn(ovhRow, col, stored0, _n);
          } else {
            sf(ovhRow, col, `=${aRef(mpOvhRow, 1 + mi)}`, { font: { color: { rgb: '008000' } }, numFmt });
          }

          for (let ei = SALARY_ROW_COUNT + 1; ei < numExps; ei++) {
            const exp = exps[ei];
            const stored = (exp?.amount !== '' && exp?.amount !== undefined) ? parseGridNum(exp.amount) : null;
            sn(ROW_OTHER_START + (ei - SALARY_ROW_COUNT), col, (stored !== null && stored !== 0) ? stored : 0, _n);
          }
        }

        // Revenue from Assumptions
        const revRaw = act.revenue;
        const hasRev = revRaw !== '' && revRaw !== undefined && revRaw !== null;
        const revOverride = act.revenueOverride;
        const hasOverride = revOverride !== undefined && revOverride !== null && revOverride !== '';
        if (hasRev && parseGridNum(revRaw) !== 0) {
          sn(ROW_REVENUE, col, parseGridNum(revRaw), _b);
        } else if (hasOverride) {
          sn(ROW_REVENUE, col, parseGridNum(revOverride), _b);
        } else {
          sf(ROW_REVENUE, col, `=${aRef(mpRevRow, 1 + mi)}`, { font: { bold: true, color: { rgb: '008000' } }, numFmt });
        }
      } else {
        // ACTUALS months: hardcoded values from stored data
        for (let ei = 0; ei < SALARY_ROW_COUNT; ei++) {
          const exp = exps[ei];
          const stored = (exp?.amount !== '' && exp?.amount !== undefined) ? parseGridNum(exp.amount) : null;
          sn(ROW_EXPS + ei, col, stored || 0, _n);
        }
        for (let ei = SALARY_ROW_COUNT; ei < numExps; ei++) {
          const exp = exps[ei];
          const stored = (exp?.amount !== '' && exp?.amount !== undefined) ? parseGridNum(exp.amount) : null;
          sn(ROW_OTHER_START + (ei - SALARY_ROW_COUNT), col, stored || 0, _n);
        }
        const revRaw = act.revenue;
        sn(ROW_REVENUE, col, (revRaw !== '' && revRaw !== undefined && revRaw !== null) ? parseGridNum(revRaw) : 0, _b);
      }

      // Total Salaries
      sf(ROW_SAL_TOT, col, `=SUM(${R(ROW_EXPS, col)}:${R(ROW_EXPS + SALARY_ROW_COUNT - 1, col)})`, _bu);

      // Total Expenses
      if (numOther > 0) {
        sf(ROW_TOT_EXP, col, `=${R(ROW_SAL_TOT, col)}+SUM(${R(ROW_OTHER_START, col)}:${R(ROW_OTHER_START + numOther - 1, col)})`, _bu);
      } else {
        sf(ROW_TOT_EXP, col, `=${R(ROW_SAL_TOT, col)}`, _bu);
      }

      // Net Burn
      sf(ROW_NET_BURN, col, `=${R(ROW_TOT_EXP, col)}-${R(ROW_REVENUE, col)}`, _bu);

      // Closing Cash Balance
      sf(ROW_CLOSING, col, `=${R(ROW_OPEN, col)}-${R(ROW_NET_BURN, col)}`, _bd);

      // Notes
      sc(ROW_NOTES, col, act.notes || '', _t);
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: TOTAL_ROWS - 1, c: COL_OFFSET + months.length - 1 } });
    const wscols = [{ wch: 24 }];
    months.forEach(() => wscols.push({ wch: 16 }));
    ws['!cols'] = wscols;
    ws['!rows'] = [];
    ws['!rows'][ROW_SAL_TOT] = { hpt: 20 };
    ws['!rows'][ROW_TOT_EXP] = { hpt: 20 };
    ws['!rows'][ROW_NET_BURN] = { hpt: 20 };
    ws['!rows'][ROW_CLOSING] = { hpt: 22 };

    XLSX.utils.book_append_sheet(wb, ws, 'Actuals');
    XLSX.writeFile(wb, 'Runway_Financial_Model.xlsx', { cellStyles: true, bookSST: true });
  } catch (e) {
    console.error('Excel export error:', e);
    alert('Excel export error: ' + e.message);
  }
}
