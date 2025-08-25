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
    dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });
  }
}
