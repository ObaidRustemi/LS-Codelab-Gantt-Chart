import * as d3 from '../vendor/d3.v7.min.js';
import { createTimeScale, createRowScale } from './scales.js';
import { shapeRows } from './parsing.js';
import { ensureTooltip, showTooltip, hideTooltip } from './tooltip.js';
import { sendRowFilter, clearRowFilter } from './interactions.js';
import * as dscc from '../vendor/dscc.min.js';

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

  const margin = { top: 24, right: 24, bottom: 24, left: 180 };
  const innerWidth = Math.max(200, width - margin.left - margin.right);
  const rowHeight = objectData.style?.appearance?.rowHeight || 28;
  const innerHeight = Math.max(rows.length * rowHeight + 20, height - margin.top - margin.bottom);

  const x = createTimeScale([minDate, maxDate], [0, innerWidth]);
  const y = createRowScale(rows.map(r => r.key), innerHeight, rowHeight);

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', margin.top + innerHeight + margin.bottom);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const teamGroups = new Map();
  rows.forEach(r => { if (!teamGroups.has(r.team)) teamGroups.set(r.team, []); teamGroups.get(r.team).push(r); });

  let yCursor = 0;
  const rowPositions = new Map();
  Array.from(teamGroups.entries()).forEach(([team, trs]) => {
    g.append('text').attr('x', -12).attr('y', yCursor + 14).attr('text-anchor', 'end').attr('fill', '#9aa4b2').text(team);
    trs.forEach((r) => { rowPositions.set(r.key, yCursor); yCursor += rowHeight; });
    yCursor += 6; // group gap
  });

  const grid = g.append('g').attr('class', 'grid');
  const ticks = x.ticks(8);
  ticks.forEach((t) => { grid.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', innerHeight).attr('stroke', '#202938'); });

  if (objectData.style?.appearance?.showToday !== false) {
    g.append('line').attr('x1', x(today)).attr('x2', x(today)).attr('y1', 0).attr('y2', innerHeight)
      .attr('stroke', objectData.style?.appearance?.todayLineColor || '#ff6b6b')
      .attr('stroke-width', objectData.style?.appearance?.todayLineWidth || 2)
      .attr('stroke-dasharray', '4,3');
  }

  const barGroup = g.append('g');
  const tooltip = ensureTooltip();

  rows.forEach((r) => {
    const yTop = rowPositions.get(r.key) + (rowHeight - 16) / 2;
    const color = teamToColor.get(r.team);

    if (r.cp5) {
      barGroup.append('rect').attr('x', x(r.cp3)).attr('y', yTop).attr('width', Math.max(1, x(r.cp5) - x(r.cp3)))
        .attr('height', 16).attr('rx', 6).attr('fill', color).attr('opacity', 0.9)
        .on('mousemove', (ev) => {
          const daysRemaining = Math.ceil((r.cp5 - today) / (1000*60*60*24));
          const html = `<strong>${r.team}</strong> — ${r.project}<br/>CP3 → CP5: ${r.cp3.toISOString().slice(0,10)} → ${r.cp5.toISOString().slice(0,10)}<br/>Days Remaining: ${daysRemaining}`;
          showTooltip(tooltip, html, ev.clientX, ev.clientY);
        })
        .on('mouseleave', () => hideTooltip(tooltip))
        .on('click', () => sendRowFilter(r.team, r.project));
    } else {
      barGroup.append('rect').attr('x', x(r.cp3) - 4).attr('y', yTop).attr('width', 8).attr('height', 16).attr('rx', 6).attr('fill', color)
        .on('mousemove', (ev) => {
          const html = `<strong>${r.team}</strong> — ${r.project}<br/>CP3: ${r.cp3.toISOString().slice(0,10)}`;
          showTooltip(tooltip, html, ev.clientX, ev.clientY);
        })
        .on('mouseleave', () => hideTooltip(tooltip))
        .on('click', () => sendRowFilter(r.team, r.project));
    }

    if (objectData.style?.appearance?.showMilestoneTicks !== false) {
      const tick = (d) => barGroup.append('path').attr('d', d3.symbol(d3.symbolDiamond, 60)).attr('transform', `translate(${x(d)}, ${yTop + 8})`).attr('fill', '#fff');
      if (r.cp35) tick(r.cp35);
      if (r.cp4) tick(r.cp4);
    }
  });

  svg.on('click', (ev) => { if (ev.target.tagName === 'svg') { clearRowFilter(); hideTooltip(tooltip); } });
}
