// src/data/chartData.ts

export const chart1Data = [
  { plan: 'Optimized', 'Cultivation': 5000, 'Storage': 3000, 'Unmet Demand': 1303 },
  { plan: 'Naïve', 'Cultivation': 4000, 'Storage': 860, 'Unmet Demand': 30000 },
  { plan: 'Equal allocation', 'Cultivation': 8000, 'Storage': 2000, 'Unmet Demand': 14474 },
  { plan: "Previous year", 'Cultivation': 6000, 'Storage': 4000, 'Unmet Demand': 2038 },
];

export const chart2Data = [
  { plan: 'Optimized', 'Annual Cost': 9303, 'Demand Coverage': 99.9 },
  { plan: "Previous year", 'Annual Cost': 12038, 'Demand Coverage': 96.7 },
  { plan: 'Equal allocation', 'Annual Cost': 24474, 'Demand Coverage': 81.2 },
  { plan: 'Naïve', 'Annual Cost': 34860, 'Demand Coverage': 68.7 },
];

export const chart3Data = [
  { name: 'Naïve', value: 4.0 },
  { name: 'Optimized', value: 3.8 },
  { name: "Previous year", value: 3.6 },
  { name: 'Equal allocation', value: 3.3 },
];

export const penaltyData = [
  { area: '0 str.', coverage: 99.9, waste: 3.7 },
  { area: '0.5 str.', coverage: 99.9, waste: 3.7 },
  { area: '1 str.', coverage: 99.9, waste: 3.8 },
  { area: '2 str.', coverage: 99.7, waste: 4.0 },
  { area: '3 str.', coverage: 99.6, waste: 4.2 },
  { area: '4 str.', coverage: 99.4, waste: 4.4 },
];

export const expectedCostData = [
  { plan: 'Deterministic', 'Expected Cost': 18214 },
  { plan: 'Stochastic', 'Expected Cost': 17096 },
  { plan: 'Perfect Information', 'Expected Cost': 14450 },
];

export const scenarioData = [
  { scenario: 'D: x0.85, Y: x0.75', 'Deterministic Plan': 17733, 'Stochastic Plan': 15150 },
  { scenario: 'D: x0.85, Y: x1', 'Deterministic Plan': 9099, 'Stochastic Plan': 9885 },
  { scenario: 'D: x1, Y: x0.75', 'Deterministic Plan': 30944, 'Stochastic Plan': 25668 },
  { scenario: 'D: x1, Y: x1', 'Deterministic Plan': 9303, 'Stochastic Plan': 11463 },
  { scenario: 'D: x1.2, Y: x0.75', 'Deterministic Plan': 48806, 'Stochastic Plan': 43418 },
  { scenario: 'D: x1.2, Y: x1', 'Deterministic Plan': 26626, 'Stochastic Plan': 21733 },
];

export const coverageData = [
  { plan: 'Hindsight', 'Mean Coverage': 90.3, 'Minimum Coverage': 71.4 },
  { plan: 'Optimization', 'Mean Coverage': 86.1, 'Minimum Coverage': 59.9 },
  { plan: 'Stochastic', 'Mean Coverage': 88.4, 'Minimum Coverage': 64.0 },
  { plan: 'Naïve', 'Mean Coverage': 60.5, 'Minimum Coverage': 41.0 },
  { plan: 'Equal Allocation', 'Mean Coverage': 71.6, 'Minimum Coverage': 48.6 },
  { plan: "Previous year", 'Mean Coverage': 84.1, 'Minimum Coverage': 57.9 },
];