export const payload = {
  theme: { seriesColor: ['#6aa0ff', '#50e3c2', '#f5a623', '#d0021b', '#9013fe'] },
  fields: [
    { id: 'team', name: 'team' },
    { id: 'projectName', name: 'projectName' },
    { id: 'cp3Date', name: 'cp3Date' },
    { id: 'cp35Date', name: 'cp35Date' },
    { id: 'cp4Date', name: 'cp4Date' },
    { id: 'cp5Date', name: 'cp5Date' }
  ],
  interactions: {},
  data: {
    tables: {
      DEFAULT: [
        { dimID: { team: 'TX', projectName: 'Smart Trip Migration', cp3Date: '2025-06-01', cp35Date: '2025-06-20', cp4Date: '2025-07-10', cp5Date: '2025-08-30' } },
        { dimID: { team: 'Rider', projectName: 'Zen Onboarding', cp3Date: '2025-05-15', cp35Date: '', cp4Date: '2025-06-25', cp5Date: '2025-09-15' } },
        { dimID: { team: 'Maps', projectName: 'HCV Alignments', cp3Date: '2025-07-05', cp35Date: '2025-07-18', cp4Date: '', cp5Date: '2025-10-01' } },
        { dimID: { team: 'TX', projectName: 'Hourly Handoff', cp3Date: '2025-04-10', cp35Date: '', cp4Date: '2025-05-15', cp5Date: '' } }
      ]
    }
  }
};
