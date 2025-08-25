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
        {
          dimID: {
            team: 'TX',
            projectName: 'TX Project 1',
            cp3Date: '2025-03-24',
            cp35Date: '2025-06-10',
            cp4Date: '2025-07-22',
            cp5Date: '2025-09-09'
          }
        },
        {
          dimID: {
            team: 'BX',
            projectName: 'BX Project 2',
            cp3Date: '2025-05-06',
            cp35Date: '2025-07-22',
            cp4Date: '2025-08-05',
            cp5Date: '2025-09-16'
          }
        },
        {
          dimID: {
            team: 'CX',
            projectName: 'CX Project 3',
            cp3Date: '2025-02-01',
            cp35Date: '2025-02-20',
            cp4Date: '2025-03-20',
            cp5Date: '2025-05-15'
          }
        },
        {
          dimID: {
            team: 'PX',
            projectName: 'PX Project 4',
            cp3Date: '2025-02-10',
            cp35Date: '2025-03-01',
            cp4Date: '2025-04-01',
            cp5Date: '2025-05-30'
          }
        },
        {
          dimID: {
            team: 'CM',
            projectName: 'CM Project 5',
            cp3Date: '2025-03-01',
            cp35Date: '2025-03-10',
            cp4Date: '2025-04-10',
            cp5Date: '2025-06-01'
          }
        }
      ]
    }
  }
};
