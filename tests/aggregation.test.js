const { calculateBordaScore, calculatePenaltyScore, calculateAggregatedScore, aggregateRankings } = require('../scripts/aggregation');

test('calculateBordaScore computes expected value', () => {
  expect(calculateBordaScore(1, 100)).toBe(100);
  expect(calculateBordaScore(50, 100)).toBe(51);
  expect(calculateBordaScore(101, 100)).toBe(0);
});

test('calculatePenaltyScore returns 10 percent of max rank', () => {
  expect(calculatePenaltyScore(100)).toBeCloseTo(10);
});

test('aggregateRankings sorts and assigns ranks correctly', () => {
  const universities = [
    { name: 'Uni A', country: 'X', rankings: { qs: { rank: 1 }, the: { rank: 2 } } },
    { name: 'Uni B', country: 'X', rankings: { qs: { rank: 2 }, the: null } }
  ];
  const weights = { qs: 1, the: 1 };
  const max = { qs: 100, the: 100 };
  const results = aggregateRankings(universities, weights, max, 2);

  expect(results[0].name).toBe('Uni A');
  expect(results[0].aggregatedRank).toBe(1);
  expect(results[1].aggregatedRank).toBe(2);
  expect(results[0].countryRank).toBe(1);
  expect(results[1].countryRank).toBe(2);
});
