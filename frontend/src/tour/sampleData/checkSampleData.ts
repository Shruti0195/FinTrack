declare const process: any;

import { generateSampleData } from './generator.ts';
import { validateSampleData } from './validator.ts';

console.log('Running automated validation on FinTrack Tour Sample Data...\n');

const data = generateSampleData(new Date());
const result = validateSampleData(data);

console.log(`Reference Date: ${data.generatedAt}`);
console.log(`Current Period: ${data.currentPeriodLabel}`);
console.log(`Income: ₹${data.currentMonthTotals.income.toLocaleString('en-IN')}`);
console.log(`Expenses: ₹${data.currentMonthTotals.expenses.toLocaleString('en-IN')}`);
console.log(`Savings: ₹${data.currentMonthTotals.savings.toLocaleString('en-IN')} (${data.currentMonthTotals.savingsRate}%)`);
console.log(`Financial Health Score: ${data.healthScore.score} (${data.healthScore.status_label})`);
console.log(`Budgets: ${data.budgets.length} total (${data.budgetSummary.safe_count} safe, ${data.budgetSummary.warning_count} warning, ${data.budgetSummary.exceeded_count} exceeded)`);
console.log(`Goals: ${data.goals.length} active (${data.goalSummary.overall_percentage}% overall)\n`);

if (!result.valid) {
  console.error('❌ VALIDATION FAILED! The following rules were broken:');
  result.errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log(`✅ ALL ${result.rulesChecked} MATHEMATICAL AND STRUCTURAL RULES PASSED SUCCESSFULLY!`);
  console.log('Sample data strictly conforms to all 8 FinTrack tour requirements.');
  process.exit(0);
}
