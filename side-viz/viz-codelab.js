// Minimal community viz: render a message from style config
if (typeof window !== 'undefined') {
  const rootId = 'hello-root';
  const ensureRoot = () => {
    let el = document.getElementById(rootId);
    if (!el) { el = document.createElement('div'); el.id = rootId; document.body.appendChild(el); }
    return el;
  };

  // Render immediately even without dscc helper (pipeline sanity)
  (() => {
    const el = ensureRoot();
    const div = document.createElement('div');
    div.className = 'hello';
    div.textContent = 'HELLO PIPELINE (static)';
    el.appendChild(div);
  })();

  const draw = (data) => {
    const el = ensureRoot();
    el.innerHTML = '';
    // Simple table as in codelab; read one dimension + one metric
    const rows = data?.tables?.DEFAULT || [];
    if (!rows.length) {
      const d = document.createElement('div'); d.className = 'hello'; d.textContent = 'HELLO PIPELINE (no data)'; el.appendChild(d); return;
    }
    const table = document.createElement('table');
    table.className = 'hello';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const th1 = document.createElement('th'); th1.textContent = 'Dimension';
    const th2 = document.createElement('th'); th2.textContent = 'Metric';
    trh.appendChild(th1); trh.appendChild(th2); thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.slice(0, 5).forEach(r => {
      const tr = document.createElement('tr');
      // Be tolerant of field ids; use first dimension/metric value found
      const dimVal = r.dimID ? Object.values(r.dimID)[0] : '';
      const metVal = r.metricID ? Object.values(r.metricID)[0] : '';
      const td1 = document.createElement('td'); td1.textContent = dimVal;
      const td2 = document.createElement('td'); td2.textContent = metVal;
      tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    el.appendChild(table);
  };
  if (window.dscc && window.dscc.subscribeToData) {
    window.dscc.subscribeToData(draw, { transform: window.dscc.objectTransform });
  }
}


