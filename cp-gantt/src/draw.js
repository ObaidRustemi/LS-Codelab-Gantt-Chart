import { d3 } from './globals.js';
import { createTimeScale, createRowScale } from './scales.js';
import { shapeRows } from './parsing.js';
import { ensureTooltip, showTooltip, hideTooltip } from './tooltip.js';
import { sendRowFilter, clearRowFilter } from './interactions.js';
import { dscc } from './globals.js';

// Keep last known good dimensions
let lastW = 960, lastH = 480;

function resolveSize() {
  const w = Number(dscc?.getWidth?.());
  const h = Number(dscc?.getHeight?.());
  const okW = Number.isFinite(w) && w > 0;
  const okH = Number.isFinite(h) && h > 0;
  if (okW) lastW = w;
  if (okH) lastH = h;
  return { w: lastW, h: lastH, ready: okW && okH };
}

function safe(n, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

export function drawViz(objectData) {
  // Resolve dimensions with fallback
  const size = resolveSize();
  if (!size.ready && dscc.getWidth) {
    // In Looker Studio, retry if dimensions not ready
    requestAnimationFrame(() => drawViz(objectData));
    return;
  }
  
  const width = size.w;
  const height = size.h;
  
  // Debug dimensions
  console.log('Dimensions:', { width, height, dsccAvailable: !!dscc.getWidth, size });
  let container = document.getElementById('container');
  if (!container) { container = document.createElement('div'); container.id = 'container'; document.body.appendChild(container); }
  container.innerHTML = '';
  
  // Robust style normalizers for Looker Studio
  function getNumber(style, id, def) {
    const v = style?.[id];
    if (v == null) return def;
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') {
      const m = v.match(/-?\d+(\.\d+)?/);     // pulls 28 from "28px"
      return m ? Number(m[0]) : def;
    }
    if (typeof v === 'object') {
      if ('value' in v && isFinite(Number(v.value))) return Number(v.value);
      if ('weight' in v && isFinite(Number(v.weight))) return Number(v.weight);  // e.g., LINE_WEIGHT
      if ('opacity' in v && isFinite(Number(v.opacity))) return Number(v.opacity);
    }
    return def;
  }

  function getColor(style, id, def) {
    const v = style?.[id];
    if (!v) return def;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v.color) return v.color;
    return def;
  }
  
  function getBoolean(style, id, def) {
    const v = style?.[id];
    if (v == null) return def;
    return Boolean(v);
  }

  let rows = shapeRows(objectData) || [];
  // Guard against any undefined entries
  rows = rows.filter((r) => r && r.cp3);
  const today = new Date();

  const cp3s = rows.map(r => r.cp3).filter(Boolean);
  const cp5s = rows.map(r => r.cp5).filter(Boolean);
  let minDate = d3.min(cp3s);
  let maxDate = d3.max(cp5s.length ? cp5s : cp3s);
  if (!minDate || !maxDate || minDate.getTime() === maxDate.getTime()) {
    minDate = d3.timeDay.offset(new Date(), -7);
    maxDate = d3.timeDay.offset(new Date(), 7);
  }

  const teams = Array.from(new Set(rows.map(r => r?.team).filter(Boolean)));
  const teamToColor = new Map();
  const themeColors = objectData.theme?.seriesColor || [];
  teams.forEach((t, i) => teamToColor.set(t, themeColors[i % themeColors.length] || d3.schemeTableau10[i % 10]));

  const milestoneColors = {
    'CP3': '#22c55e',   // green
    'CP3.5': '#8b5cf6', // purple
    'CP4': '#f59e0b'    // orange
  };

  const margin = { top: 76, right: 24, bottom: 24, left: 260 };
  const innerWidth = safe(width - margin.left - margin.right, 300);
  const rowHeight = getNumber(objectData.style, 'rowHeight', 28);
  const rowGap = 10;
  const barHeight = 18;
  const rowsLen = Array.isArray(rows) ? rows.length : 0;
  const innerHeight = safe(
    Math.max(rowsLen * (rowHeight + rowGap), height - margin.top - margin.bottom),
    200
  );
  
  // Debug style values
  console.log('Style values:', { 
    rowHeight, 
    rawRowHeight: objectData.style?.rowHeight,
    style: objectData.style 
  });
  console.log('Dimensions check:', {
    width,
    height,
    innerWidth,
    innerHeight,
    rowsLength: rowsLen,
    margins: margin
  });

  let x = createTimeScale([minDate, maxDate], [0, innerWidth]);
  const y = createRowScale(rows.map(r => r.key), innerHeight, rowHeight + rowGap);

  const svgHeight = safe(margin.top + innerHeight + margin.bottom, 400);
  const svg = d3.select(container).append('svg').attr('width', safe(width, 800)).attr('height', svgHeight);
  
  // Remove the light background - let Looker Studio's theme show through
    
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Temporary dev sanity marker to verify deployment wiring
  // Remove dev marker now that LS pipeline is proven

  // Clip path to occlude bars/grid/today within the plot area (prevents bleed into left rail)
  const clipId = `plot-clip-${Math.random().toString(36).slice(2, 8)}`;
  const glowId = `month-glow-${Math.random().toString(36).slice(2, 8)}`;
  const defs = svg.append('defs');
  defs.append('clipPath')
    .attr('id', clipId)
    .attr('clipPathUnits', 'userSpaceOnUse')
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerWidth)
    .attr('height', innerHeight);
  // Subtle orange glow for month labels
  const glow = defs.append('filter')
    .attr('id', glowId)
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');
  glow.append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 0)
    .attr('stdDeviation', 2.4)
    .attr('flood-color', '#f59e0b')
    .attr('flood-opacity', 0.65);

  // Groups for dynamic content (rendered and re-rendered on pan/zoom)
  const monthTitle = svg.append('text').attr('x', width / 2).attr('y', 26).attr('text-anchor', 'middle').attr('class', 'month-title');
  const monthsG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 34})`);
  const weeksG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top - 14})`);
  const grid = g.append('g').attr('class', 'grid').attr('clip-path', `url(#${clipId})`);
  const monthEndG = g.append('g').attr('clip-path', `url(#${clipId})`);

  // Left lane header
  svg.append('text').attr('x', 20).attr('y', 26).attr('class', 'header').text('ENGINEERING')
    .style('font-weight', '600')
    .style('font-size', '14px')
    .style('fill', '#a6b2c5');

  // Today line
  let todayLine = null;
  if (getBoolean(objectData.style, 'showToday', true)) {
    const strokeColor = getColor(objectData.style, 'todayLineColor', '#f23a2d');
    const strokeWidth = getNumber(objectData.style, 'todayLineWidth', 3);
    todayLine = g.append('line')
      .attr('y1', -18).attr('y2', innerHeight)
      .attr('stroke-width', strokeWidth)
      .attr('class', 'today-line')
      .attr('clip-path', `url(#${clipId})`);
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
    // Move the right-anchored team code a bit left so it doesn't hug the card border
    g.append('text').attr('x', -32).attr('y', yCursor + 16).attr('text-anchor', 'end').attr('fill', '#9aa4b2').text(team);
    trs.forEach((r) => {
      const yTop = yCursor + (rowHeight - barHeight) / 2;
      rowPositions.set(r.key, yCursor);
      const cardX = -margin.left + 20;
      const cardW = margin.left - 40;
      cardsG.append('rect').attr('x', cardX).attr('y', yTop - 8).attr('width', cardW).attr('height', barHeight + 16).attr('rx', 10).attr('class', 'card-bg')
        .style('fill', '#121826')
        .style('opacity', 0.55);
      cardsG.append('text').attr('x', cardX + 16).attr('y', yTop + 2).attr('dominant-baseline', 'hanging').attr('class', 'card-title').text(r.project)
        .style('fill', '#e9eef7')
        .style('font-size', '14px')
        .style('font-weight', '600');
      cardsG.append('text').attr('x', cardX + 16).attr('y', yTop + 18).attr('dominant-baseline', 'hanging').attr('class', 'card-sub').text(r.team)
        .style('fill', '#9aa4b2')
        .style('font-size', '12px');
      yCursor += rowHeight + rowGap;
    });
    yCursor += 4;
  });

  const barsG = g.append('g').attr('clip-path', `url(#${clipId})`);

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
    controls.todayText.attr('x', rightX - 14).attr('y', yTop + 16).attr('text-anchor', 'end').text(todayStr.toUpperCase())
      .style('fill', '#9aa4b2')
      .style('font-size', '14px')
      .style('font-weight', '600');
    // Buttons
    controls.buttons.forEach((b) => b.group.remove());
    controls.buttons = [];
    buttonDefs.forEach((bd, i) => {
      const gx = rightX + i * (buttonWidth + buttonGap);
      const group = controlsG.append('g').attr('transform', `translate(${gx},${yTop})`).attr('class', 'control-button')
        .style('cursor', 'pointer');
      group.append('rect').attr('rx', 6).attr('width', buttonWidth).attr('height', buttonHeight)
        .style('fill', '#1f2937')
        .style('stroke', '#374151')
        .style('stroke-width', 1)
        .style('opacity', 0.9);
      group.append('text').attr('x', buttonWidth / 2).attr('y', buttonHeight / 2 + 1).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').text(bd.label)
        .style('fill', '#e5e7eb')
        .style('font-weight', '600')
        .style('font-size', '12px')
        .style('pointer-events', 'none');
      // Add hover effect
      const rect = group.select('rect');
      group.on('mouseenter', () => rect.style('fill', '#243042'))
           .on('mouseleave', () => rect.style('fill', '#1f2937'));
      
      if (bd.onClick) {
        group.on('click', bd.onClick);
      } else {
        group.on('click', () => setViewMonths(bd.months));
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
    .attr('height', innerHeight + 36)
    .style('fill', 'transparent')
    .style('cursor', 'grab');

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
  // Set up pan handlers based on style settings
  if (getBoolean(objectData.style, 'enableDrag', true)) {
    panTarget.on('pointerdown', onPanStart).on('pointermove', onPanMove).on('pointerup pointerleave', onPanEnd);
  }
  if (getBoolean(objectData.style, 'enableWheel', true)) {
    panTarget.on('wheel', onWheel, { passive: false });
  }

  // Keyboard navigation: Left/Right = 1 week; PageUp/PageDown = 1 month
  const keyboardState = { lastKey: null, lastTime: 0, timer: null };
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const HOLD_WEEKS_PER_SEC = 0.18; // slower hold: ~1 week every ~5.5 seconds

  // Smooth animated panning for keyboard nudges
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  let rafId = null;
  function animatePan(shiftMs, baseYear, duration = 240) {
    if (rafId) cancelAnimationFrame(rafId);
    const startStart = new Date(viewState.start);
    const widthMs = +viewState.end - +viewState.start;
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const step = () => {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(t);
      const currentShift = shiftMs * eased;
      const nextStart = new Date(+startStart + currentShift);
      const [cs, ce] = clampToYear(nextStart, new Date(+nextStart + widthMs), baseYear);
      x.domain([cs, ce]);
      viewState.start = cs; viewState.end = ce;
      renderAll();
      if (t < 1) { rafId = requestAnimationFrame(step); } else { rafId = null; }
    };
    rafId = requestAnimationFrame(step);
  }

  function nudgeWeeks(direction, multiplier) {
    const shiftMs = direction * ONE_WEEK_MS * (multiplier || 1);
    if (!viewState.activeYear) viewState.activeYear = viewState.start.getFullYear();
    const duration = (multiplier && multiplier > 1) ? 220 : 960; // slower single press, faster double-press
    animatePan(shiftMs, viewState.activeYear, duration);
    if (keyboardState.timer) clearTimeout(keyboardState.timer);
    keyboardState.timer = setTimeout(() => { viewState.activeYear = null; }, 350);
  }

  function nudgeMonths(direction) {
    if (!viewState.activeYear) viewState.activeYear = viewState.start.getFullYear();
    const targetStart = d3.timeMonth.offset(viewState.start, direction);
    const shiftMs = +targetStart - +viewState.start;
    animatePan(shiftMs, viewState.activeYear, 280);
    if (keyboardState.timer) clearTimeout(keyboardState.timer);
    keyboardState.timer = setTimeout(() => { viewState.activeYear = null; }, 350);
  }

  function onKeyDown(ev) {
    const key = ev.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'PageUp' && key !== 'PageDown') return;
    ev.preventDefault();
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const isRepeat = (keyboardState.lastKey === key) && (now - keyboardState.lastTime < 300);
    keyboardState.lastKey = key; keyboardState.lastTime = now;
    const accel = (isRepeat && getBoolean(objectData.style, 'keyboardAccel', true)) ? 3 : 1; // accelerate on quick double-press if enabled
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const dir = key === 'ArrowLeft' ? -1 : 1;
      nudgeWeeks(dir, accel);
      // Start smooth hold after a short delay (ignore OS key-repeat bursts)
      holdScheduleStart(dir);
      return;
    }
    if (key === 'PageUp') return nudgeMonths(-1);
    if (key === 'PageDown') return nudgeMonths(1);
  }

  // Smooth HOLD handling for arrows
  const holdState = { dir: 0, raf: null, lastTs: 0, startTimer: null, velocityMsPerSec: 0 };
  function holdScheduleStart(dir) {
    if (holdState.startTimer) clearTimeout(holdState.startTimer);
    holdState.startTimer = setTimeout(() => startHold(dir), 320);
  }
  function startHold(dir) {
    if (!dir) return;
    if (!viewState.activeYear) viewState.activeYear = viewState.start.getFullYear();
    holdState.dir = dir;
    holdState.lastTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    holdState.velocityMsPerSec = 0;
    if (holdState.raf) cancelAnimationFrame(holdState.raf);
    const step = () => {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const dtSec = Math.min(0.04, Math.max(0, (now - holdState.lastTs) / 1000)); // tighter clamp for stability
      holdState.lastTs = now;
      // Smooth velocity ramp towards target for ultra-smooth motion
      const targetVel = holdState.dir * ONE_WEEK_MS * HOLD_WEEKS_PER_SEC; // ms per second
      const SMOOTH_ALPHA = 0.12; // approach target by ~12% per frame
      holdState.velocityMsPerSec += (targetVel - holdState.velocityMsPerSec) * SMOOTH_ALPHA;
      const shiftMs = holdState.velocityMsPerSec * dtSec;
      applyPan(shiftMs);
      holdState.raf = requestAnimationFrame(step);
    };
    holdState.raf = requestAnimationFrame(step);
  }
  function stopHold() {
    if (holdState.startTimer) { clearTimeout(holdState.startTimer); holdState.startTimer = null; }
    if (holdState.raf) { cancelAnimationFrame(holdState.raf); holdState.raf = null; }
    holdState.dir = 0;
    if (keyboardState.timer) clearTimeout(keyboardState.timer);
    keyboardState.timer = setTimeout(() => { viewState.activeYear = null; }, 250);
  }

  function onKeyUp(ev) {
    const key = ev.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      stopHold();
    }
  }

  if (typeof window !== 'undefined') {
    if (window.__cpGanttKeyHandler) window.removeEventListener('keydown', window.__cpGanttKeyHandler);
    window.__cpGanttKeyHandler = onKeyDown;
    window.addEventListener('keydown', window.__cpGanttKeyHandler);
    if (window.__cpGanttKeyUpHandler) window.removeEventListener('keyup', window.__cpGanttKeyUpHandler);
    window.__cpGanttKeyUpHandler = onKeyUp;
    window.addEventListener('keyup', window.__cpGanttKeyUpHandler);
  }

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
      const monthText = monthsG.append('text')
        .attr('x', cx)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('class', 'month-label')
        .text(new Intl.DateTimeFormat(undefined, { month: 'short' }).format(m).toUpperCase());
      
      // Apply style overrides
      const monthSize = getNumber(objectData.style, 'monthLabelSize', 16);
      const monthColor = getColor(objectData.style, 'monthLabelColor', '#f59e0b');
      monthText.style('font-size', `${monthSize}px`);
      monthText.style('fill', monthColor);
      
      if (getBoolean(objectData.style, 'monthGlow', true)) {
        monthText.attr('filter', `url(#${glowId})`);
      }
    });

    // Weeks row
    weeksG.selectAll('*').remove();
    const startMonday = d3.timeMonday.floor(viewState.start);
    const endMonday = d3.timeMonday.ceil(viewState.end);
    const weekDates = d3.timeMonday.every(1).range(startMonday, endMonday);
    weekDates.forEach((d) => {
      const xx = x(d);
      weeksG.append('text').attr('x', xx).attr('y', 0).attr('text-anchor', 'middle').attr('class', 'week-label').text(`${d.getMonth() + 1}/${d.getDate()}`)
        .style('font-size', '12px')
        .style('fill', '#909bb0');
    });

    // Grid and month-end lines
    grid.selectAll('*').remove();
    weekDates.forEach((d) => { 
      grid.append('line').attr('x1', x(d)).attr('x2', x(d)).attr('y1', 0).attr('y2', innerHeight)
        .style('stroke', '#363E4C')
        .style('stroke-width', 1); 
    });
    monthEndG.selectAll('*').remove();
    for (let i = 0; i < monthStarts.length; i++) {
      const nextStart = monthStarts[i + 1];
      if (!nextStart) break;
      const xm = x(nextStart);
      monthEndG.append('line').attr('x1', xm).attr('x2', xm).attr('y1', 0).attr('y2', innerHeight).attr('class', 'month-end-line')
        .style('stroke', '#F4D06F')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '2 4')
        .style('opacity', 0.6);
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
        .text(s.label)
        .style('fill', 'white')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('pointer-events', 'none');
    });
    if (getBoolean(objectData.style, 'showMilestoneTicks', true)) {
      const tick = (d, color) =>
        barsG.append('path')
          .attr('d', d3.symbol(d3.symbolDiamond, 60))
          .attr('transform', `translate(${x(d)}, ${yTop + barHeight / 2})`)
          .attr('fill', color)
          .style('opacity', 0.9);
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
    // Ensure left rail cards (negative x) sit above clipped plot content
    cardsG.raise();
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
