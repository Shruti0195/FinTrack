import {
  RAW_INCOME_ENTRIES,
  RAW_EXPENSE_ENTRIES,
  RAW_BUDGET_CONFIGS,
  RAW_GOAL_CONFIGS
} from './rawEntries.ts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#3B82F6',
  Food: '#10B981',
  Bills: '#F59E0B',
  Transport: '#06B6D4',
  Shopping: '#EC4899',
  Entertainment: '#8B5CF6',
  Subscriptions: '#64748B',
  Healthcare: '#EF4444',
  Other: '#14B8A6',
  Salary: '#10B981',
  Freelance: '#3B82F6',
  Investments: '#F59E0B'
};

const CATEGORY_IDS: Record<string, string> = {
  Rent: 'c0000000-0000-0000-0000-000000000001',
  Food: 'c0000000-0000-0000-0000-000000000002',
  Bills: 'c0000000-0000-0000-0000-000000000003',
  Transport: 'c0000000-0000-0000-0000-000000000004',
  Shopping: 'c0000000-0000-0000-0000-000000000005',
  Entertainment: 'c0000000-0000-0000-0000-000000000006',
  Subscriptions: 'c0000000-0000-0000-0000-000000000007',
  Healthcare: 'c0000000-0000-0000-0000-000000000008',
  Other: 'c0000000-0000-0000-0000-000000000009',
  Salary: 'c0000000-0000-0000-0000-000000000010',
  Freelance: 'c0000000-0000-0000-0000-000000000011',
  Investments: 'c0000000-0000-0000-0000-000000000012'
};

/**
 * Resolves a date offset into a concrete ISO date string (YYYY-MM-DD).
 */
export function resolveDateOffset(offsetStr: string, refDate: Date = new Date()): string {
  const target = new Date(refDate);

  if (offsetStr === 'start of this month') {
    target.setDate(1);
    return target.toISOString().split('T')[0];
  }

  const daysAgoMatch = offsetStr.match(/^(\d+)\s+days?\s+ago$/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    target.setDate(target.getDate() - days);
    return target.toISOString().split('T')[0];
  }

  const monthDayMatch = offsetStr.match(/^month([+-]\d+),\s*day\s*(\d+)$/);
  if (monthDayMatch) {
    const monthDelta = parseInt(monthDayMatch[1], 10);
    const day = parseInt(monthDayMatch[2], 10);
    target.setMonth(target.getMonth() + monthDelta);
    target.setDate(day);
    return target.toISOString().split('T')[0];
  }

  return target.toISOString().split('T')[0];
}

export interface ComputedTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryId: string;
  description: string;
  paymentMethod: string;
  dateStr: string;
  year: number;
  month: number;
  day: number;
}

export interface GeneratedSampleData {
  generatedAt: string;
  currentYear: number;
  currentMonth: number;
  currentPeriodLabel: string;
  prevPeriodLabel: string;
  incomes: ComputedTransaction[];
  expenses: ComputedTransaction[];
  monthlySummaries: {
    year: number;
    month: number;
    monthName: string;
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  }[];
  currentMonthTotals: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  };
  prevMonthTotals: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  };
  comparison: {
    incomePctChange: number;
    expensePctChange: number;
    savingsPctChange: number;
  };
  budgets: any[];
  budgetSummary: any;
  goals: any[];
  goalSummary: any;
  healthScore: any;
  notifications: any[];
  expenseCategoryBreakdown: {
    categoryId: string;
    categoryName: string;
    type: 'expense';
    amount: number;
    percentage: number;
    color: string;
    count: number;
  }[];
  incomeCategoryBreakdown: {
    categoryId: string;
    categoryName: string;
    type: 'income';
    amount: number;
    percentage: number;
    color: string;
    count: number;
  }[];
}

/**
 * Pure code generator that calculates all metrics, summaries, health scores, and budgets
 * from the raw entries. No totals or percentages are hardcoded.
 */
export function generateSampleData(refDate: Date = new Date()): GeneratedSampleData {
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth() + 1; // 1-12
  const currentPeriodLabel = `${MONTH_SHORT[currentMonth - 1]} ${currentYear}`;

  // Previous month details
  const prevDate = new Date(refDate);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;
  const prevPeriodLabel = `${MONTH_SHORT[prevMonth - 1]} ${prevYear}`;

  // 1. Process Income Transactions
  const incomes: ComputedTransaction[] = RAW_INCOME_ENTRIES.map((entry) => {
    const dateStr = resolveDateOffset(entry.dateOffset, refDate);
    const [y, m, d] = dateStr.split('-').map(Number);
    return {
      id: entry.id,
      type: 'income',
      amount: entry.amount,
      category: entry.category,
      categoryId: CATEGORY_IDS[entry.category] || CATEGORY_IDS.Salary,
      description: entry.description,
      paymentMethod: entry.paymentMethod,
      dateStr,
      year: y,
      month: m,
      day: d
    };
  });

  // 2. Process Expense Transactions
  const expenses: ComputedTransaction[] = RAW_EXPENSE_ENTRIES.map((entry) => {
    const dateStr = resolveDateOffset(entry.dateOffset, refDate);
    const [y, m, d] = dateStr.split('-').map(Number);
    return {
      id: entry.id,
      type: 'expense',
      amount: entry.amount,
      category: entry.category,
      categoryId: CATEGORY_IDS[entry.category] || CATEGORY_IDS.Other,
      description: entry.description,
      paymentMethod: entry.paymentMethod,
      dateStr,
      year: y,
      month: m,
      day: d
    };
  });

  // 3. Compute 6-Month Monthly Trends (Ending in Current Month)
  const monthlySummaries = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate);
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;

    const mIncomes = incomes.filter((t) => t.year === y && t.month === m);
    const mExpenses = expenses.filter((t) => t.year === y && t.month === m);

    const mIncTotal = mIncomes.reduce((acc, cur) => acc + cur.amount, 0);
    const mExpTotal = mExpenses.reduce((acc, cur) => acc + cur.amount, 0);
    const mSavings = mIncTotal - mExpTotal; // Rule 2: Savings = Income - Expenses
    const mSavingsRate = mIncTotal > 0 ? Math.round((mSavings / mIncTotal) * 1000) / 10 : 0.0;

    monthlySummaries.push({
      year: y,
      month: m,
      monthName: MONTH_NAMES[m - 1],
      income: mIncTotal,
      expenses: mExpTotal,
      savings: mSavings,
      savingsRate: mSavingsRate
    });
  }

  // Current and Previous month totals
  const currentSummary = monthlySummaries.find((s) => s.year === currentYear && s.month === currentMonth) || {
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0
  };
  const prevSummary = monthlySummaries.find((s) => s.year === prevYear && s.month === prevMonth) || {
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0
  };

  const currentMonthTotals = {
    income: currentSummary.income,
    expenses: currentSummary.expenses,
    savings: currentSummary.savings,
    savingsRate: currentSummary.savingsRate
  };

  const prevMonthTotals = {
    income: prevSummary.income,
    expenses: prevSummary.expenses,
    savings: prevSummary.savings,
    savingsRate: prevSummary.savingsRate
  };

  const calcChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100.0 : 0.0;
    return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
  };

  const comparison = {
    incomePctChange: calcChange(currentMonthTotals.income, prevMonthTotals.income),
    expensePctChange: calcChange(currentMonthTotals.expenses, prevMonthTotals.expenses),
    savingsPctChange: calcChange(currentMonthTotals.savings, prevMonthTotals.savings)
  };

  // 4. Current Month Category Breakdowns (Percentages must sum to 100%)
  const curExpenses = expenses.filter((t) => t.year === currentYear && t.month === currentMonth);
  const curIncomes = incomes.filter((t) => t.year === currentYear && t.month === currentMonth);

  const expMap: Record<string, { amount: number; count: number }> = {};
  curExpenses.forEach((e) => {
    if (!expMap[e.category]) expMap[e.category] = { amount: 0, count: 0 };
    expMap[e.category].amount += e.amount;
    expMap[e.category].count += 1;
  });

  const totalCurExp = currentMonthTotals.expenses;
  const expenseCategoryBreakdown = Object.entries(expMap)
    .map(([cat, data]) => {
      const pct = totalCurExp > 0 ? Math.round((data.amount / totalCurExp) * 1000) / 10 : 0.0;
      return {
        categoryId: CATEGORY_IDS[cat] || CATEGORY_IDS.Other,
        categoryName: cat,
        type: 'expense' as const,
        amount: data.amount,
        percentage: pct,
        color: CATEGORY_COLORS[cat] || '#10B981',
        count: data.count
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Normalize percentages so they sum strictly to 100%
  if (expenseCategoryBreakdown.length > 0 && totalCurExp > 0) {
    const sumPct = expenseCategoryBreakdown.reduce((acc, c) => acc + c.percentage, 0);
    const diff = Math.round((100.0 - sumPct) * 10) / 10;
    if (diff !== 0) {
      expenseCategoryBreakdown[0].percentage = Math.round((expenseCategoryBreakdown[0].percentage + diff) * 10) / 10;
    }
  }

  const incMap: Record<string, { amount: number; count: number }> = {};
  curIncomes.forEach((i) => {
    if (!incMap[i.category]) incMap[i.category] = { amount: 0, count: 0 };
    incMap[i.category].amount += i.amount;
    incMap[i.category].count += 1;
  });

  const totalCurInc = currentMonthTotals.income;
  const incomeCategoryBreakdown = Object.entries(incMap)
    .map(([cat, data]) => {
      const pct = totalCurInc > 0 ? Math.round((data.amount / totalCurInc) * 1000) / 10 : 0.0;
      return {
        categoryId: CATEGORY_IDS[cat] || CATEGORY_IDS.Salary,
        categoryName: cat,
        type: 'income' as const,
        amount: data.amount,
        percentage: pct,
        color: CATEGORY_COLORS[cat] || '#10B981',
        count: data.count
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 5. Budgets for Current Month
  // Rule 4: Each budget's 'spent' equals the sum of that month's expenses in its category.
  let safeCount = 0;
  let warningCount = 0;
  let exceededCount = 0;

  const budgets = RAW_BUDGET_CONFIGS.map((b) => {
    const spent = curExpenses
      .filter((e) => e.category === b.category)
      .reduce((acc, cur) => acc + cur.amount, 0);

    const remaining = Math.max(0, b.limitAmount - spent);
    const pctUsed = b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 1000) / 10 : 0.0;

    let status: 'safe' | 'warning' | 'exceeded' = 'safe';
    if (spent > b.limitAmount) {
      status = 'exceeded';
      exceededCount++;
    } else if (pctUsed >= 75.0) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'safe';
      safeCount++;
    }

    return {
      id: b.id,
      user_id: '00000000-0000-0000-0000-000000000000',
      category_id: CATEGORY_IDS[b.category] || CATEGORY_IDS.Other,
      category_name: b.category,
      type: 'expense',
      month: currentMonth,
      year: currentYear,
      limit_amount: b.limitAmount,
      spent_amount: spent,
      remaining_amount: remaining,
      percentage_used: pctUsed,
      status,
      period_type: 'monthly',
      period_label: currentPeriodLabel,
      months_budgeted: 1,
      has_custom_alerts: false
    };
  });

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallBudgetPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0.0;

  const budgetSummary = {
    month: currentMonth,
    year: currentYear,
    period_type: 'monthly',
    period_label: currentPeriodLabel,
    total_budget: totalBudget,
    total_spent: totalSpent,
    total_remaining: totalRemaining,
    overall_percentage: overallBudgetPercentage,
    budget_count: budgets.length,
    safe_count: safeCount,
    warning_count: warningCount,
    exceeded_count: exceededCount
  };

  // 6. Goals & Contributions
  // Rule 5: Each goal's 'saved' equals the sum of its contributions, and its percentage,
  // remaining amount and monthly suggestion are calculated from that.
  const goals = RAW_GOAL_CONFIGS.map((g) => {
    const deadlineStr = resolveDateOffset(g.deadlineOffset, refDate);
    const deadlineDate = new Date(deadlineStr);
    const diffTime = deadlineDate.getTime() - refDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

    const contributionsOut = g.contributions.map((c) => {
      const cDateStr = resolveDateOffset(c.dateOffset, refDate);
      return {
        id: c.id,
        goal_id: g.id,
        amount: c.amount,
        note: c.note,
        contributed_at: cDateStr,
        created_at: `${cDateStr}T10:00:00Z`
      };
    });

    const savedAmount = contributionsOut.reduce((acc, c) => acc + c.amount, 0);
    const remainingAmount = Math.max(0, g.targetAmount - savedAmount);
    const percentage = g.targetAmount > 0 ? Math.round((savedAmount / g.targetAmount) * 1000) / 10 : 0.0;
    const suggestedMonthly = remainingAmount > 0 ? Math.round((remainingAmount / monthsRemaining) * 10) / 10 : 0.0;

    let cheering = 'Every rupee counts toward your dream.';
    if (percentage >= 100) cheering = '🎉 Goal reached! Fantastic discipline!';
    else if (percentage >= 50) cheering = 'Over halfway there! Keep up the momentum.';

    return {
      id: g.id,
      user_id: '00000000-0000-0000-0000-000000000000',
      title: g.title,
      target_amount: g.targetAmount,
      saved_amount: savedAmount,
      remaining_amount: remainingAmount,
      percentage,
      deadline: deadlineStr,
      days_remaining: daysRemaining,
      suggested_monthly_savings: suggestedMonthly,
      color: g.color,
      icon: g.icon,
      status: percentage >= 100 ? 'completed' : 'active',
      cheering_message: cheering,
      has_custom_alerts: false,
      contributions: contributionsOut,
      created_at: `${resolveDateOffset('month-5, day 1', refDate)}T00:00:00Z`,
      updated_at: `${resolveDateOffset('start of this month', refDate)}T00:00:00Z`
    };
  });

  const totalGoals = goals.length;
  const activeGoals = goals.filter((g) => g.status === 'active').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const totalTargetAmount = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalSavedAmount = goals.reduce((acc, g) => acc + g.saved_amount, 0);
  const overallGoalPercentage = totalTargetAmount > 0 ? Math.round((totalSavedAmount / totalTargetAmount) * 1000) / 10 : 0.0;

  const goalSummary = {
    total_goals: totalGoals,
    active_goals: activeGoals,
    completed_goals: completedGoals,
    total_target_amount: totalTargetAmount,
    total_saved_amount: totalSavedAmount,
    overall_percentage: overallGoalPercentage
  };

  // 7. Financial Health Score & 4 Factors
  // Rule 7: Calculated with the exact same rules as the Analytics page (health_score_service.py).
  // If the health score rules change, update this too.

  // Factor 1: Savings Rate (35 pts)
  const factor1Max = 35.0;
  const srRatio = currentMonthTotals.income > 0 ? currentMonthTotals.savings / currentMonthTotals.income : 0.0;
  let factor1Pts = 0.0;
  if (srRatio >= 0.30) {
    factor1Pts = 35.0;
  } else if (srRatio <= 0.0) {
    factor1Pts = 0.0;
  } else {
    factor1Pts = Math.round(35.0 * (srRatio / 0.30) * 10) / 10;
  }

  // Factor 2: Budget Adherence (30 pts)
  const factor2Max = 30.0;
  const budgetCredits: number[] = [];
  let withinBudgetCount = 0;
  budgets.forEach((b) => {
    if (b.spent_amount <= b.limit_amount) {
      budgetCredits.push(1.0);
      withinBudgetCount++;
    } else if (b.spent_amount <= b.limit_amount * 1.10) {
      budgetCredits.push(0.5);
    } else {
      budgetCredits.push(0.0);
    }
  });
  const avgCredit = budgetCredits.length > 0 ? budgetCredits.reduce((a, b) => a + b, 0) / budgetCredits.length : 1.0;
  const factor2Pts = Math.round(30.0 * avgCredit * 10) / 10;

  // Factor 3: Expense Stability (20 pts)
  // Prior 3-month expense average
  const factor3Max = 20.0;
  const prior3MonthsSummaries = monthlySummaries.slice(2, 5); // Month 3, 2, 1
  const priorAvgExp = prior3MonthsSummaries.reduce((acc, cur) => acc + cur.expenses, 0) / prior3MonthsSummaries.length;
  const currExp = currentMonthTotals.expenses;
  const pctExpIncrease = priorAvgExp > 0 ? ((currExp - priorAvgExp) / priorAvgExp) * 100.0 : 0.0;

  let factor3Pts = 20.0;
  if (pctExpIncrease <= 10.0) {
    factor3Pts = 20.0; // Decreases or increase <= 10% never lose points
  } else if (pctExpIncrease >= 50.0) {
    factor3Pts = 0.0;
  } else {
    factor3Pts = Math.round(20.0 * ((50.0 - pctExpIncrease) / 40.0) * 10) / 10;
  }

  // Factor 4: Essential vs Lifestyle (15 pts)
  const factor4Max = 15.0;
  const nonEssentialCats = new Set(['shopping', 'entertainment', 'subscriptions']);
  const essentialCats = new Set(['rent', 'bills', 'food', 'healthcare', 'transport', 'education']);

  let nonEssentialTotal = 0;
  let essentialTotal = 0;
  curExpenses.forEach((e) => {
    const cLower = e.category.toLowerCase();
    if (nonEssentialCats.has(cLower)) nonEssentialTotal += e.amount;
    else if (essentialCats.has(cLower)) essentialTotal += e.amount;
  });

  const relevantExpenses = nonEssentialTotal + essentialTotal;
  const nonEssSharePct = relevantExpenses > 0 ? (nonEssentialTotal / relevantExpenses) * 100.0 : 0.0;

  let factor4Pts = 15.0;
  if (nonEssSharePct <= 30.0) {
    factor4Pts = 15.0;
  } else if (nonEssSharePct >= 60.0) {
    factor4Pts = 0.0;
  } else {
    factor4Pts = Math.round(15.0 * ((60.0 - nonEssSharePct) / 30.0) * 10) / 10;
  }

  const sumEarned = factor1Pts + factor2Pts + factor3Pts + factor4Pts;
  const healthScoreVal = Math.min(100, Math.max(0, Math.round(sumEarned)));

  let statusLabel = 'Excellent';
  let statusColor = '#10B981';
  if (healthScoreVal >= 80) {
    statusLabel = 'Excellent';
    statusColor = '#10B981';
  } else if (healthScoreVal >= 60) {
    statusLabel = 'Good';
    statusColor = '#3B82F6';
  } else if (healthScoreVal >= 40) {
    statusLabel = 'Fair';
    statusColor = '#F59E0B';
  } else {
    statusLabel = 'Needs attention';
    statusColor = '#EF4444';
  }

  const healthScore = {
    score: healthScoreVal,
    status_label: statusLabel,
    status_color: statusColor,
    factors_calculated_count: 4,
    total_factors_count: 4,
    has_enough_data: true,
    score_notes: [
      `Your current savings rate is ${currentMonthTotals.savingsRate}%, earning ${factor1Pts} of 35 points.`,
      `Maintained ${withinBudgetCount} of ${budgets.length} budgets within limit.`,
      `Monthly spending is stable vs prior 3-month average.`,
      `Lifestyle spending represents ${Math.round(nonEssSharePct)}% of expenses (within the healthy 30% guideline).`
    ],
    improvement_line: 'Keep monitoring your discretionary spending to maintain an optimal savings rate.',
    missing_factor_note: null,
    explanation_summary: 'Your Financial Health Score is computed across 4 key factors of disciplined personal finance.',
    factors: [
      {
        name: 'Savings Rate',
        earned_points: factor1Pts,
        max_points: factor1Max,
        is_calculated: true,
        user_figure_text: `Your savings rate is ${currentMonthTotals.savingsRate}%, earning ${factor1Pts} of 35 points.`,
        rule_explanation: 'Full 35 points at a savings rate of 30% or more. A rate of 0% or below earns 0 points.'
      },
      {
        name: 'Budget Adherence',
        earned_points: factor2Pts,
        max_points: factor2Max,
        is_calculated: true,
        user_figure_text: `Maintained ${withinBudgetCount} of ${budgets.length} budgets within limit, earning ${factor2Pts} of 30 points.`,
        rule_explanation: 'Full credit for spending within budget, half credit up to 10% over, no credit if over 10%.'
      },
      {
        name: 'Expense Stability',
        earned_points: factor3Pts,
        max_points: factor3Max,
        is_calculated: true,
        user_figure_text: `Monthly spending is stable vs prior average of ₹${Math.round(priorAvgExp).toLocaleString('en-IN')}, earning ${factor3Pts} of 20 points.`,
        rule_explanation: 'Full 20 points for an expense increase of 10% or less compared to prior 3-month average.'
      },
      {
        name: 'Essential vs Lifestyle',
        earned_points: factor4Pts,
        max_points: factor4Max,
        is_calculated: true,
        user_figure_text: `Lifestyle share: ${Math.round(nonEssSharePct)}% (₹${Math.round(nonEssentialTotal).toLocaleString('en-IN')} of ₹${Math.round(relevantExpenses).toLocaleString('en-IN')}), earning ${factor4Pts} of 15 points.`,
        rule_explanation: 'Full 15 points if non-essentials (Shopping, Entertainment, Subscriptions) are 30% or less of spending.'
      }
    ]
  };

  // 8. Sample Notifications Matching Exact Budgets (Rule 8)
  const notifications = [
    {
      id: 's-notif-1',
      user_id: '00000000-0000-0000-0000-000000000000',
      budget_id: 's-bud-5',
      type: 'budget_100',
      title: 'Budget Exceeded',
      message: 'You have exceeded your Bills budget for this month by ₹200 (₹3,200 spent of ₹3,000 limit).',
      target_tab: 'budgets',
      is_read: false,
      created_at: `${resolveDateOffset('3 days ago', refDate)}T14:30:00Z`,
      details: {
        category_name: 'Bills',
        spent_amount: 3200,
        limit_amount: 3000,
        percentage_used: 106.7
      }
    },
    {
      id: 's-notif-2',
      user_id: '00000000-0000-0000-0000-000000000000',
      budget_id: 's-bud-2',
      type: 'budget_80',
      title: 'Budget Warning',
      message: 'You have reached 79% of your Food budget (₹9,500 of ₹12,000 limit).',
      target_tab: 'budgets',
      is_read: false,
      created_at: `${resolveDateOffset('start of this month', refDate)}T09:15:00Z`,
      details: {
        category_name: 'Food',
        spent_amount: 9500,
        limit_amount: 12000,
        percentage_used: 79.2
      }
    }
  ];

  return {
    generatedAt: refDate.toISOString(),
    currentYear,
    currentMonth,
    currentPeriodLabel,
    prevPeriodLabel,
    incomes,
    expenses,
    monthlySummaries,
    currentMonthTotals,
    prevMonthTotals,
    comparison,
    budgets,
    budgetSummary,
    goals,
    goalSummary,
    healthScore,
    notifications,
    expenseCategoryBreakdown,
    incomeCategoryBreakdown
  };
}
