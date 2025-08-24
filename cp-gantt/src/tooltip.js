export function ensureTooltip() {
  let el = document.getElementById('cp-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cp-tooltip';
    el.className = 'tooltip';
    document.body.appendChild(el);
  }
  return el;
}

export function showTooltip(el, html, x, y) {
  el.style.display = 'block';
  el.innerHTML = html;
  const pad = 12;
  el.style.left = Math.max(8, x + pad) + 'px';
  el.style.top = Math.max(8, y + pad) + 'px';
}

export function hideTooltip(el) {
  el.style.display = 'none';
}
