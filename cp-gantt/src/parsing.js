export function parseMaybeDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    return new Date(value);
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function shapeRows(objectData) {
  const fields = objectData.fields;
  const rows = objectData.tables.DEFAULT || [];
  const get = (id) => fields.find((f) => f.id === id)?.name;
  const idx = {
    team: get('team'),
    projectName: get('projectName'),
    cp3Date: get('cp3Date'),
    cp35Date: get('cp35Date'),
    cp4Date: get('cp4Date'),
    cp5Date: get('cp5Date'),
  };
  const shaped = [];
  rows.forEach((row, i) => {
    const team = row.dimID[idx.team];
    const project = row.dimID[idx.projectName];
    const cp3 = parseMaybeDate(row.dimID[idx.cp3Date]);
    if (!cp3) { console.warn('Row missing CP3', i, row); return; }
    const cp35 = parseMaybeDate(row.dimID[idx.cp35Date]);
    const cp4 = parseMaybeDate(row.dimID[idx.cp4Date]);
    const cp5 = parseMaybeDate(row.dimID[idx.cp5Date]);
    shaped.push({ team, project, cp3, cp35, cp4, cp5, key: team + '|' + project });
  });
  return shaped;
}
