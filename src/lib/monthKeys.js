export const MNAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function getMonthKeys(gridStartKey, gridEndKey) {
  const [sy, sm] = gridStartKey.split('-').map(Number);
  const [ey, em] = gridEndKey.split('-').map(Number);
  const keys = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    keys.push({
      key: `${y}-${String(m).padStart(2,'0')}`,
      label: `${MNAMES[m-1]} ${y}`
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
}

export function buildGridRangeOptions() {
  const now = new Date();
  const opts = [];
  // 3 months back through 24 months forward
  for (let offset = -3; offset <= 24; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = `${MNAMES[m - 1]} ${y}`;
    const isCurrent = offset === 0;
    opts.push({ key, label, isCurrent });
  }
  return opts;
}

export function getMonthMode(key, actualsCutoffKey) {
  return key <= actualsCutoffKey ? 'actuals' : 'estimate';
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

// Alias used by panel components
export const getMonthOptions = buildGridRangeOptions;
