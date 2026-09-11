import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildLearningDashboard } from '../utils/common/learningStats.js';
import { buildPaper } from '../utils/common/paperEngine.js';
import { createLearningPerformanceFixtures } from './fixtures/direct-capabilities-fixtures.mjs';

const fixtures = createLearningPerformanceFixtures();
if (fixtures.paper.candidates.math.length !== 300 || fixtures.dashboard.input.chineseLogs.length !== 1000 || fixtures.dashboard.input.englishLogs.length !== 1000) throw new Error('学习端压力夹具规模不正确');
const grade = 'grade1-term2';
const activeDashboardInput = {
  ...fixtures.dashboard.input,
  grade,
  chineseLogs: fixtures.dashboard.input.chineseLogs.map(item => ({ ...item, grade })),
  englishLogs: fixtures.dashboard.input.englishLogs.map(item => ({ ...item, grade })),
  mathHistory: fixtures.dashboard.input.mathHistory.map(item => ({ ...item, grade })),
  chineseDue: fixtures.dashboard.input.chineseDue.map(item => ({ ...item, grade })),
  englishDue: fixtures.dashboard.input.englishDue.map(item => ({ ...item, grade })),
  mathDue: fixtures.dashboard.input.mathDue.map(item => ({ ...item, grade })),
  goal: { schemaVersion: 2, byGrade: { [grade]: fixtures.dashboard.input.goal } },
  challenge: { schemaVersion: 2, byGrade: { [grade]: { badges: {} } } },
};
const withGrade2Noise = items => [
  ...items,
  ...items.map((item, index) => ({ ...item, grade: 'grade2', id: `grade2-noise:${item.id ?? index}` })),
];
const dashboardInput = {
  ...activeDashboardInput,
  chineseLogs: withGrade2Noise(activeDashboardInput.chineseLogs),
  englishLogs: withGrade2Noise(activeDashboardInput.englishLogs),
  mathHistory: withGrade2Noise(activeDashboardInput.mathHistory),
  chineseDue: withGrade2Noise(activeDashboardInput.chineseDue),
  englishDue: withGrade2Noise(activeDashboardInput.englishDue),
  mathDue: withGrade2Noise(activeDashboardInput.mathDue),
  goal: { schemaVersion: 2, byGrade: { ...activeDashboardInput.goal.byGrade, grade2: { dailyTarget: 200 } } },
  challenge: { schemaVersion: 2, byGrade: { ...activeDashboardInput.challenge.byGrade, grade2: { badges: { '2026-08-24': { earnedAt: '2026-08-29T00:00:00.000Z' } } } } },
};
assert.deepEqual(
  buildLearningDashboard(dashboardInput, fixtures.dashboard.now),
  buildLearningDashboard(activeDashboardInput, fixtures.dashboard.now),
  '其他年级噪声不应改变当前年级看板输出',
);

function measure(name, operation) {
  for (let index = 0; index < 2; index++) operation();
  const values = [];
  for (let index = 0; index < 20; index++) {
    const startedAt = performance.now();
    operation();
    values.push(Number((performance.now() - startedAt).toFixed(6)));
  }
  const max = Math.max(...values);
  if (max >= 200) throw new Error(`${name} 最大耗时 ${max}ms，不满足 <200ms`);
  return { name, warmups: 2, samples: values, max };
}

const results = [
  measure('buildLearningDashboard', () => buildLearningDashboard(dashboardInput, fixtures.dashboard.now)),
  measure('buildPaper', () => buildPaper(fixtures.paper)),
];

console.log(JSON.stringify({ node: process.version, seed: 20260829, results }, null, 2));
