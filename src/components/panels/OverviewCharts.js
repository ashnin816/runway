'use client';
import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, LineController,
  BarElement, BarController,
  ArcElement, DoughnutController, Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, LineController,
  BarElement, BarController,
  ArcElement, DoughnutController, Filler, Tooltip, Legend,
);

const FONT_FAMILY = "'JetBrains Mono', monospace";

function fmtAxisDollar(val) {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return '$' + Math.round(val / 1_000) + 'K';
  return '$' + val;
}

function fmtTooltipDollar(val) {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// Chart.js plugin to render center text in the doughnut
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const meta = chart.config.options?.plugins?.centerText;
    if (!meta?.text) return;
    const { ctx, chartArea: { left, right, top, bottom } } = chart;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = meta.color || '#1e293b';
    ctx.font = `600 ${meta.fontSize || 20}px ${FONT_FAMILY}`;
    ctx.fillText(meta.text, cx, cy - 8);
    ctx.font = `400 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('monthly burn', cx, cy + 14);
    ctx.restore();
  },
};
ChartJS.register(centerTextPlugin);

export default function OverviewCharts({ projectionData = [], burnBreakdown = {}, cashOutIdx = -1, varianceData = [] }) {
  const lineRef = useRef(null);
  const doughnutRef = useRef(null);
  const varianceRef = useRef(null);
  const lineChart = useRef(null);
  const doughnutChart = useRef(null);
  const varianceChart = useRef(null);

  // --- Line Chart ---
  useEffect(() => {
    if (!lineRef.current || projectionData.length === 0) return;
    if (lineChart.current) lineChart.current.destroy();

    const ctx = lineRef.current.getContext('2d');
    const labels = projectionData.map(d => d.label);
    const data = projectionData.map(d => d.cash);

    // Split into actuals and estimates datasets
    const actualData = projectionData.map(d => d.isActual ? d.cash : null);
    const estimateData = projectionData.map((d, i) => {
      // Include the last actual point so the lines connect
      if (!d.isActual) return d.cash;
      if (i < projectionData.length - 1 && !projectionData[i + 1].isActual) return d.cash;
      return null;
    });

    // Gradient fills
    const blueGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
    blueGrad.addColorStop(0, 'rgba(59,130,246,.18)');
    blueGrad.addColorStop(1, 'rgba(59,130,246,.01)');

    const amberGrad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
    amberGrad.addColorStop(0, 'rgba(245,158,11,.14)');
    amberGrad.addColorStop(1, 'rgba(245,158,11,.01)');

    // Red shading plugin for below-zero area
    const belowZeroPlugin = {
      id: 'belowZero',
      beforeDraw(chart) {
        const { ctx: c, chartArea, scales: { y, x: xScale } } = chart;
        const zeroY = y.getPixelForValue(0);
        if (zeroY <= chartArea.top) return; // zero not visible
        c.save();
        c.fillStyle = 'rgba(239,68,68,.07)';
        const top = Math.max(zeroY, chartArea.top);
        c.fillRect(chartArea.left, top, chartArea.right - chartArea.left, chartArea.bottom - top);
        c.restore();
      },
    };

    lineChart.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual',
            data: actualData,
            borderColor: '#3b82f6',
            backgroundColor: blueGrad,
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            fill: true,
            tension: 0.3,
            spanGaps: false,
          },
          {
            label: 'Estimate',
            data: estimateData,
            borderColor: '#f59e0b',
            backgroundColor: amberGrad,
            borderWidth: 2.5,
            borderDash: [6, 4],
            pointRadius: 2,
            pointBackgroundColor: '#f59e0b',
            fill: true,
            tension: 0.3,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { family: FONT_FAMILY, size: 11 },
              color: '#64748b',
              usePointStyle: true,
              pointStyleWidth: 12,
              padding: 16,
            },
          },
          title: {
            display: true,
            text: 'Cash Projection',
            font: { family: FONT_FAMILY, size: 13, weight: '600' },
            color: '#1e293b',
            padding: { bottom: 12 },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: FONT_FAMILY, size: 11 },
            bodyFont: { family: FONT_FAMILY, size: 12 },
            cornerRadius: 6,
            padding: 10,
            callbacks: {
              label(ctx) {
                if (ctx.raw === null) return null;
                return `${ctx.dataset.label}: ${fmtTooltipDollar(ctx.raw)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { family: FONT_FAMILY, size: 10 },
              color: '#94a3b8',
              maxRotation: 45,
              minRotation: 0,
            },
            grid: { color: 'rgba(0,0,0,.06)', drawBorder: false },
            border: { display: false },
          },
          y: {
            ticks: {
              font: { family: FONT_FAMILY, size: 10 },
              color: '#94a3b8',
              callback: fmtAxisDollar,
            },
            grid: { color: 'rgba(0,0,0,.06)', drawBorder: false },
            border: { display: false },
          },
        },
      },
      plugins: [
        belowZeroPlugin,
        // Zero line annotation
        {
          id: 'zeroLine',
          beforeDraw(chart) {
            const { ctx: c, chartArea, scales: { y } } = chart;
            const zeroY = y.getPixelForValue(0);
            if (zeroY < chartArea.top || zeroY > chartArea.bottom) return;
            c.save();
            c.setLineDash([6, 4]);
            c.strokeStyle = '#ef4444';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(chartArea.left, zeroY);
            c.lineTo(chartArea.right, zeroY);
            c.stroke();
            c.restore();
          },
        },
      ],
    });

    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [projectionData]);

  // --- Doughnut Chart ---
  useEffect(() => {
    if (!doughnutRef.current) return;
    if (doughnutChart.current) doughnutChart.current.destroy();

    const segments = [];
    const colors = [];
    const segLabels = [];
    const { salaries = 0, contractors = 0, overhead = 0 } = burnBreakdown;
    if (salaries > 0) { segments.push(salaries); colors.push('#3b82f6'); segLabels.push('Salaries'); }
    if (contractors > 0) { segments.push(contractors); colors.push('#8b5cf6'); segLabels.push('Contractors'); }
    if (overhead > 0) { segments.push(overhead); colors.push('#f59e0b'); segLabels.push('Overhead'); }

    const total = salaries + contractors + overhead;

    if (segments.length === 0) {
      segments.push(1);
      colors.push('#e2e8f0');
      segLabels.push('No data');
    }

    const ctx = doughnutRef.current.getContext('2d');
    doughnutChart.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: segLabels,
        datasets: [{
          data: segments,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: FONT_FAMILY, size: 11 },
              color: '#64748b',
              usePointStyle: true,
              pointStyleWidth: 10,
              padding: 14,
            },
          },
          title: {
            display: true,
            text: 'Burn Breakdown',
            font: { family: FONT_FAMILY, size: 13, weight: '600' },
            color: '#1e293b',
            padding: { bottom: 8 },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: FONT_FAMILY, size: 11 },
            bodyFont: { family: FONT_FAMILY, size: 12 },
            cornerRadius: 6,
            padding: 10,
            callbacks: {
              label(ctx) {
                return `${ctx.label}: ${fmtTooltipDollar(ctx.raw)}`;
              },
            },
          },
          centerText: {
            text: total > 0 ? fmtAxisDollar(total) : '',
            fontSize: 20,
            color: '#1e293b',
          },
        },
      },
    });

    return () => { if (doughnutChart.current) doughnutChart.current.destroy(); };
  }, [burnBreakdown]);

  // --- Variance Chart ---
  useEffect(() => {
    if (!varianceRef.current || varianceData.length === 0) return;
    if (varianceChart.current) varianceChart.current.destroy();

    const ctx = varianceRef.current.getContext('2d');
    const labels = varianceData.map(d => d.label);

    varianceChart.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Estimated',
            data: varianceData.map(d => Math.round(d.estExp)),
            backgroundColor: 'rgba(148,163,184,.25)',
            borderColor: 'rgba(148,163,184,.4)',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
          {
            label: 'Actual',
            data: varianceData.map(d => Math.round(d.actualExp)),
            backgroundColor: varianceData.map(d =>
              d.expVariance > 0 ? 'rgba(239,68,68,.6)' : 'rgba(34,197,94,.6)'
            ),
            borderColor: varianceData.map(d =>
              d.expVariance > 0 ? 'rgba(239,68,68,.8)' : 'rgba(34,197,94,.8)'
            ),
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: FONT_FAMILY, size: 10 },
              boxWidth: 10,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(59,130,246,.2)',
            borderWidth: 1,
            titleFont: { family: FONT_FAMILY, size: 11, weight: '600' },
            bodyFont: { family: FONT_FAMILY, size: 11 },
            titleColor: '#60a5fa',
            bodyColor: '#e2e8f0',
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              afterBody(items) {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const d = varianceData[idx];
                if (!d) return '';
                const v = d.expVariance;
                const sign = v > 0 ? '+' : '\u2212';
                const pct = d.estExp ? Math.round(Math.abs(v) / d.estExp * 100) : 0;
                const color = v > 0 ? 'Over budget' : 'Under budget';
                return `\n${color}: ${sign}${fmtTooltipDollar(Math.abs(v))} (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: FONT_FAMILY, size: 10 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(0,0,0,.04)', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { family: FONT_FAMILY, size: 10 },
              callback: fmtAxisDollar,
            },
            border: { display: false },
          },
        },
      },
    });

    return () => { if (varianceChart.current) varianceChart.current.destroy(); };
  }, [varianceData]);

  if (projectionData.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ flex: '2', padding: '20px 22px', marginBottom: 0 }}>
          <div style={{
            textAlign: 'center', color: '#94a3b8', padding: '40px 20px',
            fontFamily: FONT_FAMILY, fontSize: 13,
          }}>
            No projection data available
          </div>
        </div>
        <div className="card" style={{ flex: '1', padding: '20px 22px', marginBottom: 0 }}>
          <canvas ref={doughnutRef} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ flex: '2', padding: '20px 22px', marginBottom: 0 }}>
          <div style={{
            fontFamily: FONT_FAMILY, fontSize: 10, letterSpacing: '.1em',
            textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12, fontWeight: 500,
          }}>
            Cash Projection
          </div>
          <div style={{ position: 'relative', height: 260 }}>
            <canvas ref={lineRef} />
          </div>
        </div>
        <div className="card" style={{ flex: '1', padding: '20px 22px', marginBottom: 0 }}>
          <div style={{
            fontFamily: FONT_FAMILY, fontSize: 10, letterSpacing: '.1em',
            textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12, fontWeight: 500,
          }}>
            Burn Breakdown
          </div>
          <div style={{ position: 'relative', height: 260 }}>
            <canvas ref={doughnutRef} />
          </div>
        </div>
      </div>
      {varianceData.length >= 2 && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
          <div style={{
            fontFamily: FONT_FAMILY, fontSize: 10, letterSpacing: '.1em',
            textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4, fontWeight: 500,
          }}>
            Actuals vs. Estimate
          </div>
          <div style={{
            fontFamily: FONT_FAMILY, fontSize: 11, color: '#64748b', marginBottom: 12,
          }}>
            Monthly expenses — estimated vs. what actually happened
          </div>
          <div style={{ position: 'relative', height: 220 }}>
            <canvas ref={varianceRef} />
          </div>
        </div>
      )}
    </>
  );
}
