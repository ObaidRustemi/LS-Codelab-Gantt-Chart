import * as dscc from '../vendor/dscc.min.js';
import * as d3 from '../vendor/d3.v7.min.js';
import { drawViz } from './draw.js';

if (typeof window !== 'undefined') {
  const LOCAL = Boolean(window.LOCAL);
  if (LOCAL) {
    import('../sample-data/localData.js').then(({ payload }) => {
      drawViz({ data: payload.data, fields: payload.fields, theme: payload.theme, interactions: payload.interactions });
    });
  } else {
    dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });
  }
}

export { dscc, d3 };
