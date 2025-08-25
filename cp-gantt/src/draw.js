import { d3 } from './globals.js';
import { createTimeScale, createRowScale } from './scales.js';
import { shapeRows } from './parsing.js';
import { ensureTooltip, showTooltip, hideTooltip } from './tooltip.js';
import { sendRowFilter, clearRowFilter } from './interactions.js';
import { dscc } from './globals.js';

export function drawViz(objectData) {
  const width = dscc.getWidth ? dscc.getWidth() : window.innerWidth;
  const height = dscc.getHeight ? dscc.getHeight() : window.innerHeight;
  let container = document.getElementById('container');
  if (!container) { container = document.createElement('div'); container.id = 'container'; document.body.appendChild(container); }
  container.innerHTML = '';

  const rows = shapeRows(objectData);
  const today = new Date();

  const cp3s = rows.map(r => r.cp3).filter(Boolean);
  const cp5s = rows.map(r => r.cp5).filter(Boolean);
  let minDate = d3.min(cp3s);
  let maxDate = d3.max(cp5s.length ? cp5s : cp3s);
  if (!minDate || !maxDate || minDate.getTime() === maxDate.getTime()) {
    minDate = d3.timeDay.offset(new Date(), -7);
    maxDate = d3.timeDay.offset(new Date(), 7);
  }

  const teams = Array.from(new Set(rows.map(r => r.team)));
  const teamToColor = new Map();
  const themeColors = objectData.theme?.seriesColor || [];
  teams.forEach((t, i) => teamToColor.set(t, themeColors[i % themeColors.length] || d3.schemeTableau10[i % 10]));

  const margin = { top: 76, right: 24, bottom: 24, left: 260 };
  const innerWidth = Math.max(300, width - margin.left - margin.right);
  const rowHeight = objectData.style?.appearance?.rowHeight || 28;
  const rowGap = 10;
  const barHeight = 18;
  const innerHeight = Math.max(rows.length * (rowHeight + rowGap), height - margin.top - margin.bottom);

  const x = createTimeScale([minDate, maxDate], [0, innerWidth]);
  const y = createRowScale(rows.map(r => r.key), innerHeight, rowHeight + rowGap);

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', margin.top + innerHeight + margin.bottom);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Header: Month RANGE and per-month labels
  const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const sameMonth = startMonth.getFullYear() === endMonth.getFullYear() && startMonth.getMonth() === endMonth.getMonth();
  const fmtShort = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
  const fmtLong = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  const titleText = sameMonth
    ? fmtLong.format(startMonth).toUpperCase()
    : `${fmtShort.format(startMonth).toUpperCase()} – ${fmtShort.format(endMonth).toUpperCase()}`;
  svg.append('text').attr('x', width / 2).attr('y', 26).attr('text-anchor', 'middle').attr('class', 'month-title').text(titleText);

  const monthsG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 34})`);
  const monthStarts = [];
  let cur = new Date(startMonth);
  while (cur <= endMonth) { monthStarts.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  monthStarts.forEach((m, idx) => {
    const x0 = x(m);
    const next = monthStarts[idx + 1];
    const x1 = next ? x(next) : x(maxDate);
    const cx = (x0 + x1) / 2;
    monthsG.append('text').attr('x', cx).attr('y', 0).attr('text-anchor', 'middle').attr('class', 'week-label').text(new Intl.DateTimeFormat(undefined, { month: 'short' }).format(m).toUpperCase());
  });

  // Week labels (every Monday) across the range
  const weeksG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 14})`);
  const startMonday = d3.timeMonday.floor(minDate);
  const endMonday = d3.timeMonday.ceil(maxDate);
  const weekDates = d3.timeMonday.every(1).range(startMonday, endMonday);
  weekDates.forEach((d) => {
    const xx = x(d);
    weeksG.append('text')
      .attr('x', xx)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('class', 'week-label')
      .text(`${d.getMonth() + 1}/${d.getDate()}`);
  });

  // Vertical grid at each week
  const grid = g.append('g').attr('class', 'grid');
  weekDates.forEach((d) => { grid.append('line').attr('x1', x(d)).attr('x2', x(d)).attr('y1', 0).attr('y2', innerHeight).attr('stroke', '#202938'); });

  // Month end dotted lines
  const monthEndG = g.append('g');
  for (let i = 0; i < monthStarts.length; i++) {
    const nextStart = monthStarts[i + 1];
    if (!nextStart) break;
    const xm = x(nextStart);
    monthEndG.append('line')
      .attr('x1', xm)
      .attr('x2', xm)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('class', 'month-end-line');
  }

  // Left lane header
  svg.append('text').attr('x', 20).attr('y', 26).attr('class', 'header').text('ENGINEERING');

  // Today line with label
  if (objectData.style?.appearance?.showToday !== false) {
    g.append('line').attr('x1', x(today)).attr('x2', x(today)).attr('y1', -18).attr('y2', innerHeight)
      .attr('stroke', objectData.style?.appearance?.todayLineColor || '#ff6b6b')
      .attr('stroke-width', objectData.style?.appearance?.todayLineWidth || 2)
      .attr('class', 'today-line');
  }

  const tooltip = ensureTooltip();

  function chevronPath(x0, x1, yTop, h, radius = 6, withArrow = true) {
    const w = Math.max(1, x1 - x0);
    const tip = Math.min(14, Math.max(8, Math.floor(w * 0.12)));
    const r = Math.min(radius, h / 2);
    const xr = x0 + r;
    const yr = yTop + r;
    const xEnd = x1 - (withArrow ? tip : r);
    const path = [
      `M${x0},${yr}`,
      `Q${x0},${yTop} ${xr},${yTop}`,
      `L${xEnd},${yTop}`,
      withArrow ? `L${x1},${yTop + h / 2}` : `Q${x1},${yTop} ${x1},${yr}`,
      `L${xEnd},${yTop + h}`,
      `L${xr},${yTop + h}`,
      `Q${x0},${yTop + h} ${x0},${yTop + h - r}`,
      `Z`
    ];
    return path.join(' ');
  }

  const teamGroups = new Map();
  rows.forEach(r => { if (!teamGroups.has(r.team)) teamGroups.set(r.team, []); teamGroups.get(r.team).push(r); });

  const rowPositions = new Map();
  let yCursor = 0;
  const cardsG = g.append('g');
  Array.from(teamGroups.entries()).forEach(([team, trs]) => {
    g.append('text').attr('x', -16).attr('y', yCursor + 16).attr('text-anchor', 'end').attr('fill', '#9aa4b2').text(team);
    trs.forEach((r) => {
      const yTop = yCursor + (rowHeight - barHeight) / 2;
      rowPositions.set(r.key, yCursor);
      const cardX = -margin.left + 20;
      const cardW = margin.left - 40;
      cardsG.append('rect').attr('x', cardX).attr('y', yTop - 8).attr('width', cardW).attr('height', barHeight + 16).attr('rx', 10).attr('class', 'card-bg');
      cardsG.append('text').attr('x', cardX + 16).attr('y', yTop + 2).attr('dominant-baseline', 'hanging').attr('class', 'card-title').text(r.project);
      cardsG.append('text').attr('x', cardX + 16).attr('y', yTop + 18).attr('dominant-baseline', 'hanging').attr('class', 'card-sub').text(r.team);
      yCursor += rowHeight + rowGap;
    });
    yCursor += 4;
  });

  const barsG = g.append('g');

  rows.forEach((r) => {
    const rowY = rowPositions.get(r.key);
    const yTop = rowY + (rowHeight - barHeight) / 2;
    const baseColor = teamToColor.get(r.team);

    const segs = [];
    const milestones = [
      { id: 'CP3', date: r.cp3 },
      { id: 'CP3.5', date: r.cp35 },
      { id: 'CP4', date: r.cp4 },
      { id: 'CP5', date: r.cp5 }
    ].filter(m => m.date).sort((a, b) => a.date - b.date);

    if (milestones.length) {
      for (let i = 0; i < milestones.length; i++) {
        const a = milestones[i];
        const b = milestones[i + 1];
        if (!b && a.id === 'CP3' && !r.cp5) {
          barsG.append('rect').attr('x', x(a.date) - 6).attr('y', yTop).attr('width', 12).attr('height', barHeight).attr('rx', 8).attr('fill', baseColor);
          continue;
        }
        const x0 = x(a.date);
        const x1 = x(b ? b.date : r.cp5);
        if (isFinite(x0) && isFinite(x1) && x1 > x0) {
          segs.push({ label: a.id, x0, x1 });
        }
      }
    }

    segs.forEach((s, idx) => {
      const withArrow = idx < segs.length - 1 || !!r.cp5;
      const d = chevronPath(s.x0, s.x1, yTop, barHeight, 8, withArrow);
      barsG.append('path')
        .attr('d', d)
        .attr('fill', baseColor)
        .attr('opacity', 0.92)
        .on('mousemove', (ev) => {
          const rangeTxt = r.cp5 ? `${r.cp3.toISOString().slice(0,10)} → ${r.cp5.toISOString().slice(0,10)}` : `${r.cp3.toISOString().slice(0,10)} → ?`;
          const daysRemaining = r.cp5 ? Math.ceil((r.cp5 - today) / (1000*60*60*24)) : null;
          const html = `<strong>${r.team}</strong> — ${r.project}<br/>${rangeTxt}${daysRemaining!=null?`<br/>Days Remaining: ${daysRemaining}`:''}`;
          showTooltip(tooltip, html, ev.clientX, ev.clientY);
        })
        .on('mouseleave', () => hideTooltip(tooltip))
        .on('click', () => sendRowFilter(r.team, r.project));

      barsG.append('text')
        .attr('x', (s.x0 + s.x1) / 2)
        .attr('y', yTop + barHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'bar-label')
        .text(s.label);
    });

    if (objectData.style?.appearance?.showMilestoneTicks !== false) {
      const tick = (d) => barsG.append('path').attr('d', d3.symbol(d3.symbolDiamond, 60)).attr('transform', `translate(${x(d)}, ${yTop + barHeight / 2})`).attr('fill', '#fff');
      if (r.cp35) tick(r.cp35);
      if (r.cp4) tick(r.cp4);
    }
  });

  svg.on('click', (ev) => { if (ev.target.tagName === 'svg') { clearRowFilter(); hideTooltip(tooltip); } });
}
