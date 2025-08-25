import { dscc } from './globals.js';
import { drawViz } from './draw.js';

if (typeof window !== 'undefined') {
  const LOCAL = Boolean(window.LOCAL);
  if (LOCAL) {
    // Use pre-injected payload if available; otherwise dynamic import
    const w = window;
    const usePayload = (p) => {
      drawViz({
        fields: p.fields,
        tables: p.data.tables,
        theme: p.theme,
        interactions: p.interactions,
        style: { appearance: {} }
      });
    };
    if (w.LOCAL_PAYLOAD) {
      usePayload(w.LOCAL_PAYLOAD);
    } else {
      import('../sample-data/localData.js').then(({ payload }) => usePayload(payload));
    }
  } else {
    const safeDraw = (data) => {
      try {
        drawViz(data);
      } catch (e) {
        const id = 'cpg-error';
        let el = document.getElementById(id);
        if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
        el.textContent = 'Render error: ' + (e?.message || e);
        el.style.position = 'absolute'; el.style.left = '12px'; el.style.top = '12px'; el.style.color = '#f59e0b'; el.style.font = '12px monospace';
      }
    };
    dscc.subscribeToData(safeDraw, { transform: dscc.objectTransform });
  }
}
