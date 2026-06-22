const busRoutes = {
  'BUS001-AT': {
    busName: 'Andheri-Thane Express',
    direction: 'Andheri to Thane',
    route: [
      { name: 'Andheri', distance: 0 },
      { name: 'Jogeshwari', distance: 5 },
      { name: 'Goregaon', distance: 10 },
      { name: 'Malad', distance: 15 },
      { name: 'Thane', distance: 25 },
    ],
  },
  'BUS001-TA': {
    busName: 'Thane-Andheri Express',
    direction: 'Thane to Andheri',
    route: [
      { name: 'Thane', distance: 0 },
      { name: 'Malad', distance: 10 },
      { name: 'Goregaon', distance: 15 },
      { name: 'Jogeshwari', distance: 20 },
      { name: 'Andheri', distance: 25 },
    ],
  },
  'BUS002-BM': {
    busName: 'Bandra-Mulund Shuttle',
    direction: 'Bandra to Mulund',
    route: [
      { name: 'Bandra', distance: 0 },
      { name: 'Sion', distance: 6 },
      { name: 'Ghatkopar', distance: 10 },
      { name: 'Mulund', distance: 18 },
    ],
  },
  'BUS002-MB': {
    busName: 'Mulund-Bandra Shuttle',
    direction: 'Mulund to Bandra',
    route: [
      { name: 'Mulund', distance: 0 },
      { name: 'Ghatkopar', distance: 8 },
      { name: 'Sion', distance: 12 },
      { name: 'Bandra', distance: 18 },
    ],
  },
  'BUS003-DV': {
    busName: 'Dadar-Vashi Connector',
    direction: 'Dadar to Vashi',
    route: [
      { name: 'Dadar', distance: 0 },
      { name: 'Sion', distance: 5 },
      { name: 'Chembur', distance: 10 },
      { name: 'Vashi', distance: 16 },
    ],
  },
  'BUS003-VD': {
    busName: 'Vashi-Dadar Connector',
    direction: 'Vashi to Dadar',
    route: [
      { name: 'Vashi', distance: 0 },
      { name: 'Chembur', distance: 6 },
      { name: 'Sion', distance: 11 },
      { name: 'Dadar', distance: 16 },
    ],
  },
};

export default busRoutes;