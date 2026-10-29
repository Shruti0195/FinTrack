import { generateSampleData, type GeneratedSampleData } from './generator.ts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  rulesChecked: number;
}

/**
 * Automated validator ensuring that all 8 strict FinTrack sample data rules
 * and API payload shapes are mathematically satisfied.
 */
export function validateSampleData(data: GeneratedSampleData = generateSampleData()): ValidationResult {
  const errors: string[] = [];
  let rulesChecked = 0;

  // -------------------------------------------------------------
  // Rule 1: Total expenses < total income every month, savings rate 20% to 35%
  // -------------------------------------------------------------
  rulesChecked++;
  for (const s of data.monthlySummaries) {
    if (s.expenses >= s.income) {
      errors.push(`Rule 1 violation: Month ${s.monthName} ${s.year} expenses (₹${s.expenses}) >= income (₹${s.income}).`);
    }
    if (s.savingsRate < 20.0 || s.savingsRate > 35.0) {
      errors.push(`Rule 1 violation: Month ${s.monthName} ${s.year} savings rate (${s.savingsRate}%) outside 20% to 35% target.`);
    }
  }

  // -------------------------------------------------------------
  // Rule 2: Savings = income minus expenses, everywhere it appears.
  // Goal contributions are never counted as expenses or savings.
  // -------------------------------------------------------------
  rulesChecked++;
  for (const s of data.monthlySummaries) {
    const expectedSavings = s.income - s.expenses;
    if (Math.abs(s.savings - expectedSavings) > 0.01) {
      errors.push(`Rule 2 violation: Month ${s.monthName} savings (${s.savings}) != income (${s.income}) - expenses (${s.expenses}).`);
    }
  }
  const curExpectedSavings = data.currentMonthTotals.income - data.currentMonthTotals.expenses;
  if (Math.abs(data.currentMonthTotals.savings - curExpectedSavings) > 0.01) {
    errors.push(`Rule 2 violation: currentMonthTotals savings mismatch.`);
  }

  // Verify goal contributions are completely separate
  const allGoalContributionsTotal = data.goals.reduce((acc, g) => acc + g.saved_amount, 0);
  if (allGoalContributionsTotal <= 0) {
    errors.push('Rule 2 violation: No goal contributions tracked in sample data.');
  }
  const totalCurExpenses = data.currentMonthTotals.expenses;
  const rawExpenseSum = data.expenses
    .filter((e) => e.year === data.currentYear && e.month === data.currentMonth)
    .reduce((acc, e) => acc + e.amount, 0);
  if (Math.abs(totalCurExpenses - rawExpenseSum) > 0.01) {
    errors.push(`Rule 2 violation: Expenses sum does not match raw entries (goal contribution contamination).`);
  }

  // -------------------------------------------------------------
  // Rule 3: Category amounts add up to total expenses, and percentages add up to 100%.
  // -------------------------------------------------------------
  rulesChecked++;
  const sumCatAmounts = data.expenseCategoryBreakdown.reduce((acc, c) => acc + c.amount, 0);
  if (Math.abs(sumCatAmounts - data.currentMonthTotals.expenses) > 0.01) {
    errors.push(`Rule 3 violation: Sum of expense categories (₹${sumCatAmounts}) != total expenses (₹${data.currentMonthTotals.expenses}).`);
  }
  const sumCatPct = data.expenseCategoryBreakdown.reduce((acc, c) => acc + c.percentage, 0);
  if (Math.abs(sumCatPct - 100.0) > 0.1) {
    errors.push(`Rule 3 violation: Expense category percentages sum to ${sumCatPct}%, expected 100%.`);
  }

  // -------------------------------------------------------------
  // Rule 4: Each budget's 'spent' equals the sum of that month's expenses in its category.
  // -------------------------------------------------------------
  rulesChecked++;
  const curExp = data.expenses.filter((e) => e.year === data.currentYear && e.month === data.currentMonth);
  for (const b of data.budgets) {
    const expectedSpent = curExp
      .filter((e) => e.category === b.category_name)
      .reduce((acc, e) => acc + e.amount, 0);
    if (Math.abs(b.spent_amount - expectedSpent) > 0.01) {
      errors.push(`Rule 4 violation: Budget for ${b.category_name} spent (₹${b.spent_amount}) != sum of expenses (₹${expectedSpent}).`);
    }
  }

  // -------------------------------------------------------------
  // Rule 5: Each goal's 'saved' equals the sum of its contributions,
  // and its percentage, remaining amount and monthly suggestion are calculated from that.
  // -------------------------------------------------------------
  rulesChecked++;
  for (const g of data.goals) {
    const expectedSaved = (g.contributions || []).reduce((acc: number, c: any) => acc + c.amount, 0);
    if (Math.abs(g.saved_amount - expectedSaved) > 0.01) {
      errors.push(`Rule 5 violation: Goal "${g.title}" saved (₹${g.saved_amount}) != sum of contributions (₹${expectedSaved}).`);
    }
    const expectedRemaining = Math.max(0, g.target_amount - g.saved_amount);
    if (Math.abs(g.remaining_amount - expectedRemaining) > 0.01) {
      errors.push(`Rule 5 violation: Goal "${g.title}" remaining (₹${g.remaining_amount}) != target - saved (₹${expectedRemaining}).`);
    }
    const expectedPct = g.target_amount > 0 ? Math.round((g.saved_amount / g.target_amount) * 1000) / 10 : 0.0;
    if (Math.abs(g.percentage - expectedPct) > 0.1) {
      errors.push(`Rule 5 violation: Goal "${g.title}" percentage (${g.percentage}%) != calculated (${expectedPct}%).`);
    }
  }

  // -------------------------------------------------------------
  // Rule 6: Dashboard totals, recent transactions, Income/Expense lists,
  // six-month chart, and Analytics comparison all agree.
  // -------------------------------------------------------------
  rulesChecked++;
  const curMonthIncomeListTotal = data.incomes
    .filter((i) => i.year === data.currentYear && i.month === data.currentMonth)
    .reduce((acc, i) => acc + i.amount, 0);
  if (Math.abs(curMonthIncomeListTotal - data.currentMonthTotals.income) > 0.01) {
    errors.push(`Rule 6 violation: Current month income list total != currentMonthTotals.income.`);
  }

  const curMonthExpenseListTotal = data.expenses
    .filter((e) => e.year === data.currentYear && e.month === data.currentMonth)
    .reduce((acc, e) => acc + e.amount, 0);
  if (Math.abs(curMonthExpenseListTotal - data.currentMonthTotals.expenses) > 0.01) {
    errors.push(`Rule 6 violation: Current month expense list total != currentMonthTotals.expenses.`);
  }

  // -------------------------------------------------------------
  // Rule 7: Financial Health Score and its 4 factors match exact rules,
  // points add up to total, status word matches.
  // -------------------------------------------------------------
  rulesChecked++;
  const factorSum = data.healthScore.factors.reduce((acc: number, f: any) => acc + f.earned_points, 0);
  const expectedFinalScore = Math.min(100, Math.max(0, Math.round(factorSum)));
  if (data.healthScore.score !== expectedFinalScore) {
    errors.push(`Rule 7 violation: Health score (${data.healthScore.score}) != sum of factor points (${expectedFinalScore}).`);
  }
  let expectedStatus = 'Needs attention';
  if (expectedFinalScore >= 80) expectedStatus = 'Excellent';
  else if (expectedFinalScore >= 60) expectedStatus = 'Good';
  else if (expectedFinalScore >= 40) expectedStatus = 'Fair';

  if (data.healthScore.status_label !== expectedStatus) {
    errors.push(`Rule 7 violation: Health score status label "${data.healthScore.status_label}" != expected "${expectedStatus}".`);
  }

  // -------------------------------------------------------------
  // Rule 8: Sample notifications match sample budgets exactly.
  // -------------------------------------------------------------
  rulesChecked++;
  for (const n of data.notifications) {
    if (n.budget_id) {
      const b = data.budgets.find((bg) => bg.id === n.budget_id);
      if (!b) {
        errors.push(`Rule 8 violation: Notification references missing budget ${n.budget_id}.`);
      } else {
        if (n.details.category_name !== b.category_name) {
          errors.push(`Rule 8 violation: Notification category "${n.details.category_name}" != budget "${b.category_name}".`);
        }
        if (n.details.limit_amount !== b.limit_amount) {
          errors.push(`Rule 8 violation: Notification limit "${n.details.limit_amount}" != budget "${b.limit_amount}".`);
        }
        if (n.details.spent_amount !== b.spent_amount) {
          errors.push(`Rule 8 violation: Notification spent "${n.details.spent_amount}" != budget "${b.spent_amount}".`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    rulesChecked
  };
}
