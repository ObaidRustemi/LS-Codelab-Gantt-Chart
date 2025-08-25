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

// Helper to get first element of array or value itself
const first = v => Array.isArray(v) ? v[0] : v ?? null;

// Robust date parser for Looker Studio
function parseDateMaybe(x) {
  if (!x && x !== 0) return null;
  if (x instanceof Date && !isNaN(+x)) return x;

  const s = String(first(x)).trim();
  // YYYYMMDD -> Date (UTC to avoid TZ drift)
  if (/^\d{8}$/.test(s)) {
    const y = +s.slice(0,4), m = +s.slice(4,6) - 1, d = +s.slice(6,8);
    return new Date(Date.UTC(y, m, d));
  }
  // epoch ms / epoch s
  if (/^\d{10,13}$/.test(s)) {
    const n = s.length === 13 ? +s : (+s * 1000);
    const dt = new Date(n);
    return isNaN(+dt) ? null : dt;
  }
  // ISO / locale
  const dt = new Date(s);
  return isNaN(+dt) ? null : dt;
}

// Find the right table in Looker Studio data
function resolveTable(data) {
  const t = data?.tables || {};
  // Prefer DEFAULT if present, else first array entry
  if (Array.isArray(t.DEFAULT)) return t.DEFAULT;
  const key = Object.keys(t).find(k => Array.isArray(t[k]));
  return key ? t[key] : [];
}

export function shapeRows(objectData) {
  const rawRows = resolveTable(objectData);
  
  if (!rawRows.length) return [];

  const out = [];

  for (const r of rawRows) {
    // LS payload usually exposes row.dimID with your config element ids as keys
    const dim = r.dimID || r.dim || r.dimensions || r || {};
    
    // read by id, not index; accept synonyms if your config changed
    const team = first(dim.team);
    const project = first(dim.summary || dim.projectName || dim.project || dim['Project Name']);
    const cp3 = parseDateMaybe(dim.cp3Date);
    const cp35 = parseDateMaybe(dim.cp35Date);
    const cp4 = parseDateMaybe(dim.cp4Date);
    const cp5 = parseDateMaybe(dim.cp5Date);

    // Enforce CP3 required — skip ONLY if truly missing or unparsable
    if (!team || !cp3) {
      continue;
    }
    
    // Use team as project name if project is missing
    const finalProject = project || team;

    out.push({ team, project: finalProject, cp3, cp35, cp4, cp5, key: team + '|' + finalProject });
  }

  return out;
}
