import { calculatePaycheck } from '../dist/index.js';

const result = calculatePaycheck({
  monthlySalary: '1000.00',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  mode: 'SIMPLE',
});

console.log(JSON.stringify({ net: result.value.net, estimate: result.estimate, rules: result.rules.map((rule) => rule.code) }, null, 2));
