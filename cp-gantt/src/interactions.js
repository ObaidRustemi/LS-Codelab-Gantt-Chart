import { dscc } from './globals.js';

export function sendRowFilter(team, project) {
  const concepts = [{ id: 'team', value: team }];
  if (project) concepts.push({ id: 'projectName', value: project });
  dscc.sendInteraction('rowFilter', dscc.InteractionType.FILTER, { concepts });
}

export function clearRowFilter() {
  dscc.clearInteraction('rowFilter', dscc.InteractionType.FILTER);
}
