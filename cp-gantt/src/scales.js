import { d3 } from './globals.js';

export function createTimeScale(domain, range) {
  const scale = d3.scaleTime().domain(domain).range(range).nice();
  return scale;
}

export function createRowScale(rows, height, rowHeight) {
  return d3.scaleBand().domain(rows).range([0, rows.length * rowHeight]).paddingInner(0.2).paddingOuter(0.1);
}
