export function parseMaybeDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    // Support milliseconds epoch and YYYYMMDD integers
    const s = String(value);
    if (s.length === 8 && /^\d{8}$/.test(s)) {
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6)) - 1;
      const d = Number(s.slice(6, 8));
      return new Date(y, m, d);
    }
    return new Date(value);
  }
  // Support YYYYMMDD strings
  if (typeof value === 'string' && /^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return new Date(y, m, d);
  }
  // Support DD/Mon/YY (and d/Mon/YY), e.g., 24/Mar/25
  if (typeof value === 'string' && /^(\d{1,2})\/([A-Za-z]{3})\/(\d{2})$/.test(value)) {
    const [, dd, mon, yy] = value.match(/(\d{1,2})\/([A-Za-z]{3})\/(\d{2})/);
    const map = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    const m = map[mon.charAt(0).toUpperCase() + mon.slice(1,3).toLowerCase()];
    if (m != null) {
      const year = 2000 + Number(yy);
      return new Date(year, m, Number(dd));
    }
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function shapeRows(objectData) {
  const rows = objectData.tables.DEFAULT || [];
  // In Looker Studio's objectTransform, row.dimID/metricID objects are keyed by the
  // field IDs we defined in the config. Use those IDs directly to read values.
  const idx = {
    team: 'team',
    projectName: 'projectName',
    cp3Date: 'cp3Date',
    cp35Date: 'cp35Date',
    cp4Date: 'cp4Date',
    cp5Date: 'cp5Date',
  };
  const shaped = [];
  rows.forEach((row, i) => {
    const dim = row?.dimID || {};
    const team = dim[idx.team];
    const project = dim[idx.projectName];
    const cp3 = parseMaybeDate(dim[idx.cp3Date]);
    if (!cp3) { return; }
    const cp35 = parseMaybeDate(dim[idx.cp35Date]);
    const cp4 = parseMaybeDate(dim[idx.cp4Date]);
    const cp5 = parseMaybeDate(dim[idx.cp5Date]);
    shaped.push({ team, project, cp3, cp35, cp4, cp5, key: team + '|' + project });
  });
  return shaped;
}
