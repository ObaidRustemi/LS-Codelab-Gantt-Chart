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

  const milestoneColors = {
    'CP3': '#22c55e',   // green
    'CP3.5': '#8b5cf6', // purple
    'CP4': '#f59e0b'    // orange
  };

  const margin = { top: 76, right: 24, bottom: 24, left: 260 };
  const innerWidth = Math.max(300, width - margin.left - margin.right);
  const rowHeight = objectData.style?.appearance?.rowHeight || 28;
  const rowGap = 10;
  const barHeight = 18;
  const innerHeight = Math.max(rows.length * (rowHeight + rowGap), height - margin.top - margin.bottom);

  let x = createTimeScale([minDate, maxDate], [0, innerWidth]);
  const y = createRowScale(rows.map(r => r.key), innerHeight, rowHeight + rowGap);

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', margin.top + innerHeight + margin.bottom);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Groups for dynamic content (rendered and re-rendered on pan/zoom)
  const monthTitle = svg.append('text').attr('x', width / 2).attr('y', 26).attr('text-anchor', 'middle').attr('class', 'month-title');
  const monthsG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 34})`);
  const weeksG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 14})`);
  const grid = g.append('g').attr('class', 'grid');
  const monthEndG = g.append('g');

  // Left lane header
  svg.append('text').attr('x', 20).attr('y', 26).attr('class', 'header').text('ENGINEERING');

  // Today line
  let todayLine = null;
  if (objectData.style?.appearance?.showToday !== false) {
    const strokeColor = objectData.style?.appearance?.todayLineColor;
    const strokeWidth = (objectData.style?.appearance?.todayLineWidth || 3);
    todayLine = g.append('line')
      .attr('y1', -18).attr('y2', innerHeight)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'today-line');
    if (strokeColor) todayLine.attr('stroke', strokeColor);
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

  // Controls (right side): Today text and 1M/3M/6M buttons
  const controlsG = svg.append('g');
  const controls = {
    todayText: controlsG.append('text').attr('class', 'header'),
    buttons: []
  };
  const buttonDefs = [
    { label: 'TODAY', onClick: snapToToday },
    { label: '1M', months: 1 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 }
  ];
  const buttonWidth = 44;
  const buttonHeight = 22;
  const buttonGap = 8;
  function positionControls() {
    const totalButtonsW = buttonDefs.length * buttonWidth + (buttonDefs.length - 1) * buttonGap;
    const rightX = width - 16 - totalButtonsW;
    const yTop = 14;
    // Today text to the left
    const todayStr = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date());
    controls.todayText.attr('x', rightX - 14).attr('y', yTop + 16).attr('text-anchor', 'end').text(todayStr.toUpperCase());
    // Buttons
    controls.buttons.forEach((b) => b.group.remove());
    controls.buttons = [];
    buttonDefs.forEach((bd, i) => {
      const gx = rightX + i * (buttonWidth + buttonGap);
      const group = controlsG.append('g').attr('transform', `translate(${gx},${yTop})`).attr('class', 'control-button');
      group.append('rect').attr('rx', 6).attr('width', buttonWidth).attr('height', buttonHeight);
      group.append('text').attr('x', buttonWidth / 2).attr('y', buttonHeight / 2 + 1).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('class', 'bar-label').text(bd.label);
      if (bd.onClick) {
        group.style('cursor', 'pointer').on('click', bd.onClick);
      } else {
        group.style('cursor', 'pointer').on('click', () => setViewMonths(bd.months));
      }
      controls.buttons.push({ group });
    });
  }

  // View state and panning
  const viewState = {
    start: new Date(x.domain()[0]),
    end: new Date(x.domain()[1]),
    isDragging: false,
    dragStartX: 0,
    dragStartDomain: null,
    activeYear: null
  };

  function clampToYear(start, end, baseYear) {
    const viewWidthMs = +end - +start;
    const year = (baseYear != null) ? baseYear : new Date(start).getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    const maxStart = new Date(+yearEnd - viewWidthMs);
    const clampedStart = new Date(Math.max(+yearStart, Math.min(+start, +maxStart)));
    const clampedEnd = new Date(+clampedStart + viewWidthMs);
    return [clampedStart, clampedEnd];
  }

  function applyDomain(start, end) {
    viewState.start = new Date(start);
    viewState.end = new Date(end);
    x.domain([viewState.start, viewState.end]);
    renderAll();
  }

  function applyPan(shiftMs) {
    const widthMs = +viewState.end - +viewState.start;
    const nextStart = new Date(+viewState.start + shiftMs);
    const baseYear = viewState.activeYear != null ? viewState.activeYear : viewState.start.getFullYear();
    const [cs, ce] = clampToYear(nextStart, new Date(+nextStart + widthMs), baseYear);
    applyDomain(cs, ce);
  }

  function setViewMonths(months) {
    const nextEnd = new Date(viewState.start);
    nextEnd.setMonth(viewState.start.getMonth() + months);
    const [cs, ce] = clampToYear(viewState.start, nextEnd);
    applyDomain(cs, ce);
  }

  function snapToToday() {
    const widthMs = +viewState.end - +viewState.start;
    const today = new Date();
    const tentativeStart = new Date(+today - Math.floor(widthMs / 2));
    const tentativeEnd = new Date(+tentativeStart + widthMs);
    const [cs, ce] = clampToYear(tentativeStart, tentativeEnd);
    applyDomain(cs, ce);
  }

  const panTarget = g.append('rect')
    .attr('class', 'pan-target')
    .attr('x', 0)
    .attr('y', -36)
    .attr('width', innerWidth)
    .attr('height', innerHeight + 36);

  function onPanStart(ev) {
    viewState.isDragging = true;
    viewState.dragStartX = d3.pointer(ev, g.node())[0];
    viewState.dragStartDomain = [new Date(viewState.start), new Date(viewState.end)];
    viewState.activeYear = viewState.start.getFullYear();
  }
  function onPanMove(ev) {
    if (!viewState.isDragging) return;
    const xNow = d3.pointer(ev, g.node())[0];
    const dx = xNow - viewState.dragStartX;
    const domain = viewState.dragStartDomain;
    const msPerPixel = (+domain[1] - +domain[0]) / innerWidth;
    const shiftMs = -dx * msPerPixel;
    const widthMs = +domain[1] - +domain[0];
    const nextStart = new Date(+domain[0] + shiftMs);
    const baseYear = viewState.activeYear != null ? viewState.activeYear : viewState.start.getFullYear();
    const [cs, ce] = clampToYear(nextStart, new Date(+nextStart + widthMs), baseYear);
    x.domain([cs, ce]);
    // lightweight live update
    viewState.start = cs; viewState.end = ce;
    renderAll();
  }
  function onPanEnd() { viewState.isDragging = false; viewState.activeYear = null; }
  function onWheel(ev) {
    if (ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
      ev.preventDefault();
      const msPerPixel = (+viewState.end - +viewState.start) / innerWidth;
      const shiftMs = -ev.deltaX * msPerPixel;
      applyPan(shiftMs);
    }
  }
  panTarget.on('pointerdown', onPanStart).on('pointermove', onPanMove).on('pointerup pointerleave', onPanEnd).on('wheel', onWheel, { passive: false });

  function updateTodayLine() {
    if (!todayLine) return;
    // Keep today anchored to the active domain year when outside
    const now = new Date();
    let candidate = now;
    if (now < viewState.start || now > viewState.end) {
      let t = new Date(viewState.start.getFullYear(), now.getMonth(), now.getDate());
      if (t >= viewState.start && t <= viewState.end) candidate = t; else {
        t = new Date(viewState.end.getFullYear(), now.getMonth(), now.getDate());
        if (t >= viewState.start && t <= viewState.end) candidate = t;
      }
    }
    const clamped = candidate < viewState.start ? viewState.start : (candidate > viewState.end ? viewState.end : candidate);
    const xx = x(clamped);
    todayLine.attr('x1', xx).attr('x2', xx);
  }

  function renderHeaderLabels() {
    const startMonth = new Date(viewState.start.getFullYear(), viewState.start.getMonth(), 1);
    const endMonthAnchor = new Date(viewState.end.getFullYear(), viewState.end.getMonth(), 1);
    const sameMonth = startMonth.getFullYear() === endMonthAnchor.getFullYear() && startMonth.getMonth() === endMonthAnchor.getMonth();
    const fmtShort = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
    const fmtLong = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    const titleText = sameMonth ? fmtLong.format(startMonth).toUpperCase() : `${fmtShort.format(startMonth).toUpperCase()} – ${fmtShort.format(endMonthAnchor).toUpperCase()}`;
    monthTitle.text(titleText);

    // Months row
    monthsG.selectAll('*').remove();
    const monthStarts = [];
    let cur = new Date(startMonth);
    const lastMonthStart = new Date(endMonthAnchor.getFullYear(), endMonthAnchor.getMonth(), 1);
    while (cur <= lastMonthStart) { monthStarts.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
    monthStarts.forEach((m, idx) => {
      const x0 = x(m);
      const next = monthStarts[idx + 1];
      const x1 = next ? x(next) : x(viewState.end);
      const cx = (x0 + x1) / 2;
      monthsG.append('text').attr('x', cx).attr('y', 0).attr('text-anchor', 'middle').attr('class', 'week-label').text(new Intl.DateTimeFormat(undefined, { month: 'short' }).format(m).toUpperCase());
    });

    // Weeks row
    weeksG.selectAll('*').remove();
    const startMonday = d3.timeMonday.floor(viewState.start);
    const endMonday = d3.timeMonday.ceil(viewState.end);
    const weekDates = d3.timeMonday.every(1).range(startMonday, endMonday);
    weekDates.forEach((d) => {
      const xx = x(d);
      weeksG.append('text').attr('x', xx).attr('y', 0).attr('text-anchor', 'middle').attr('class', 'week-label').text(`${d.getMonth() + 1}/${d.getDate()}`);
    });

    // Grid and month-end lines
    grid.selectAll('*').remove();
    weekDates.forEach((d) => { grid.append('line').attr('x1', x(d)).attr('x2', x(d)).attr('y1', 0).attr('y2', innerHeight).attr('stroke', '#202938'); });
    monthEndG.selectAll('*').remove();
    for (let i = 0; i < monthStarts.length; i++) {
      const nextStart = monthStarts[i + 1];
      if (!nextStart) break;
      const xm = x(nextStart);
      monthEndG.append('line').attr('x1', xm).attr('x2', xm).attr('y1', 0).attr('y2', innerHeight).attr('class', 'month-end-line');
    }
  }

  function renderBars() {
    barsG.selectAll('*').remove();
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
            barsG.append('rect').attr('x', x(a.date) - 6).attr('y', yTop).attr('width', 12).attr('height', barHeight).attr('rx', 8).attr('fill', milestoneColors['CP3'] || baseColor);
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
          .attr('fill', milestoneColors[s.label] || baseColor)
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
        const tick = (d, color) =>
          barsG.append('path')
            .attr('d', d3.symbol(d3.symbolDiamond, 60))
            .attr('transform', `translate(${x(d)}, ${yTop + barHeight / 2})`)
            .attr('fill', color);
        if (r.cp35) tick(r.cp35, milestoneColors['CP3.5'] || '#fff');
        if (r.cp4) tick(r.cp4, milestoneColors['CP4'] || '#fff');
      }
    });
  }

  function renderAll() {
    positionControls();
    renderHeaderLabels();
    renderBars();
    updateTodayLine();
  }

  // Initial paint
  renderAll();

  svg.on('click', (ev) => { if (ev.target.tagName === 'svg') { clearRowFilter(); hideTooltip(tooltip); } });

  // Timers: update today line and today text once per minute
  const tickUpdate = () => {
    updateTodayLine();
    positionControls();
  };
  if (typeof window !== 'undefined') {
    if (window.__cpGanttTimer) clearInterval(window.__cpGanttTimer);
    window.__cpGanttTimer = setInterval(tickUpdate, 60 * 1000);
  }
}
