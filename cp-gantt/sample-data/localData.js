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
            cp3Date: '2024-03-12',
            cp35Date: '2024-06-10',
            cp4Date: '2024-07-22',
            cp5Date: '2024-09-09'
          }
        },
        {
          dimID: {
            team: 'BX',
            projectName: 'BX Project 2',
            cp3Date: '2024-05-06',
            cp35Date: '2024-07-22',
            cp4Date: '2024-08-05',
            cp5Date: '2024-09-16'
          }
        }
      ]
    }
  }
};
