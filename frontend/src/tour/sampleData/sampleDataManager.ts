import { generateSampleData, type GeneratedSampleData } from './generator.ts';
import { validateSampleData } from './validator.ts';

export type TourMode = 'full' | 'page';

class SampleDataManager {
  private active: boolean = false;
  private mode: TourMode | null = null;
  private sampleData: GeneratedSampleData | null = null;
  private sampleSections: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();

  public isTourActive(): boolean {
    return this.active;
  }

  public getTourMode(): TourMode | null {
    return this.mode;
  }

  public getSampleData(): GeneratedSampleData {
    if (!this.sampleData) {
      this.sampleData = generateSampleData(new Date());
      // Run automated validation checks on generation
      const validation = validateSampleData(this.sampleData);
      if (!validation.valid) {
        console.error('Sample data validation failed:', validation.errors);
      }
    }
    return this.sampleData;
  }

  public startTour(mode: TourMode): void {
    this.active = true;
    this.mode = mode;
    this.sampleSections.clear();

    // Generate clean sample data for this tour session
    this.sampleData = generateSampleData(new Date());

    // In both full tour and page tour: users with real data keep their real data.
    // If a section is empty, the response interceptor dynamically marks it and substitutes sample data.

    this.notify();
    window.dispatchEvent(new CustomEvent('fintrack:sample-data-changed', { detail: { active: true, mode } }));
  }

  public stopTour(): void {
    this.active = false;
    this.mode = null;
    this.sampleData = null;
    this.sampleSections.clear();

    this.notify();
    window.dispatchEvent(new CustomEvent('fintrack:sample-data-changed', { detail: { active: false, mode: null } }));
  }

  public isSectionUsingSample(section: string): boolean {
    if (!this.active) return false;
    return this.sampleSections.has(section.toLowerCase());
  }

  public markSectionUsingSample(section: string, usingSample: boolean): void {
    if (!this.active) return;
    const key = section.toLowerCase();
    const prev = this.sampleSections.has(key);
    if (usingSample) {
      this.sampleSections.add(key);
    } else {
      this.sampleSections.delete(key);
    }
    if (prev !== usingSample) {
      this.notify();
    }
  }

  public getSampleSections(): string[] {
    return Array.from(this.sampleSections);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // -------------------------------------------------------------
  // API Payloads Formatted Exactly as Real Backend Endpoints
  // -------------------------------------------------------------

  public getDashboardOverviewPayload(): any {
    const data = this.getSampleData();
    return {
      period_type: 'monthly',
      period_label: data.currentPeriodLabel,
      year: data.currentYear,
      month: data.currentMonth,
      quarter: Math.ceil(data.currentMonth / 3),
      half: data.currentMonth <= 6 ? 1 : 2,
      total_income: data.currentMonthTotals.income,
      total_expenses: data.currentMonthTotals.expenses,
      net_savings: data.currentMonthTotals.savings,
      savings_rate: data.currentMonthTotals.savingsRate,
      income_change_pct: data.comparison.incomePctChange,
      expense_change_pct: data.comparison.expensePctChange,
      savings_change_pct: data.comparison.savingsPctChange,
      financial_health_score: data.healthScore.score,
      financial_health_label: data.healthScore.status_label,
      has_enough_data: true,
      monthly_trends: data.monthlySummaries,
      expense_breakdown: data.expenseCategoryBreakdown,
      income_breakdown: data.incomeCategoryBreakdown,
      recent_transactions: data.expenses.slice(0, 5).map((e) => ({
        id: e.id,
        type: 'expense',
        category_name: e.category,
        amount: e.amount,
        description: e.description,
        payment_method: e.paymentMethod,
        transaction_date: e.dateStr
      }))
    };
  }

  public getIncomeListPayload(): any {
    const data = this.getSampleData();
    const items = data.incomes.map((i) => ({
      id: i.id,
      amount: i.amount,
      category_id: i.categoryId,
      category_name: i.category,
      description: i.description,
      payment_method: i.paymentMethod,
      transaction_date: i.dateStr,
      created_at: `${i.dateStr}T10:00:00Z`
    }));

    return {
      items,
      total_count: items.length,
      total_amount: items.reduce((acc, cur) => acc + cur.amount, 0),
      page: 1,
      limit: 50,
      total_pages: 1
    };
  }

  public getIncomeStatsPayload(): any {
    const data = this.getSampleData();
    const curIncomes = data.incomes.filter((i) => i.year === data.currentYear && i.month === data.currentMonth);
    const topCat = data.incomeCategoryBreakdown[0] || { categoryName: 'Salary', amount: 50000, percentage: 100 };

    return {
      total_income_this_month: data.currentMonthTotals.income,
      total_income_last_month: data.prevMonthTotals.income,
      month_over_month_change_pct: data.comparison.incomePctChange,
      entries_count_this_month: curIncomes.length,
      avg_income_per_entry: curIncomes.length > 0 ? Math.round(data.currentMonthTotals.income / curIncomes.length) : 0,
      top_source_name: topCat.categoryName,
      top_source_amount: topCat.amount,
      top_source_percentage: topCat.percentage,
      category_breakdown: data.incomeCategoryBreakdown.map((c) => ({
        category_id: c.categoryId,
        category_name: c.categoryName,
        total_amount: c.amount,
        percentage: c.percentage,
        count: c.count
      }))
    };
  }

  public getExpenseListPayload(): any {
    const data = this.getSampleData();
    const items = data.expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      category_id: e.categoryId,
      category_name: e.category,
      description: e.description,
      payment_method: e.paymentMethod,
      transaction_date: e.dateStr,
      created_at: `${e.dateStr}T10:00:00Z`
    }));

    return {
      items,
      total_count: items.length,
      total_amount: items.reduce((acc, cur) => acc + cur.amount, 0),
      page: 1,
      limit: 50,
      total_pages: 1
    };
  }

  public getExpenseStatsPayload(): any {
    const data = this.getSampleData();
    const curExpenses = data.expenses.filter((e) => e.year === data.currentYear && e.month === data.currentMonth);
    const topCat = data.expenseCategoryBreakdown[0] || { categoryName: 'Rent', amount: 15000, percentage: 41.1 };

    return {
      total_expense_this_month: data.currentMonthTotals.expenses,
      total_expense_last_month: data.prevMonthTotals.expenses,
      month_over_month_change_pct: data.comparison.expensePctChange,
      entries_count_this_month: curExpenses.length,
      avg_expense_per_entry: curExpenses.length > 0 ? Math.round(data.currentMonthTotals.expenses / curExpenses.length) : 0,
      top_category_name: topCat.categoryName,
      top_category_amount: topCat.amount,
      top_category_percentage: topCat.percentage,
      category_breakdown: data.expenseCategoryBreakdown.map((c) => ({
        category_id: c.categoryId,
        category_name: c.categoryName,
        total_amount: c.amount,
        percentage: c.percentage,
        count: c.count
      }))
    };
  }

  public getBudgetsPayload(): any[] {
    return this.getSampleData().budgets;
  }

  public getBudgetSummaryPayload(): any {
    return this.getSampleData().budgetSummary;
  }

  public getGoalsPayload(): any[] {
    return this.getSampleData().goals;
  }

  public getGoalSummaryPayload(): any {
    return this.getSampleData().goalSummary;
  }

  public getAnalyticsOverviewPayload(): any {
    const data = this.getSampleData();
    const curExp = data.expenses.filter((e) => e.year === data.currentYear && e.month === data.currentMonth);
    const top5Expenses = [...curExp]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        description: e.description,
        category_name: e.category,
        amount: e.amount,
        transaction_date: e.dateStr
      }));

    const top5Cats = data.expenseCategoryBreakdown.slice(0, 5).map((c) => ({
      category_id: c.categoryId,
      category_name: c.categoryName,
      amount: c.amount,
      percentage: c.percentage,
      color: c.color,
      is_essential: ['rent', 'food', 'bills', 'transport', 'healthcare'].includes(c.categoryName.toLowerCase()),
      transaction_count: c.count
    }));

    return {
      period_type: 'monthly',
      period_label: data.currentPeriodLabel,
      year: data.currentYear,
      month: data.currentMonth,
      quarter: Math.ceil(data.currentMonth / 3),
      half: data.currentMonth <= 6 ? 1 : 2,
      has_enough_data: true,
      health_score: data.healthScore,
      trends: {
        monthly_trends: data.monthlySummaries,
        savings_takeaway: `You consistently saved ~${data.currentMonthTotals.savingsRate}% of income, well within the healthy 20-35% range.`,
        healthy_savings_range_min: 20.0,
        healthy_savings_range_max: 35.0
      },
      expense_mix: data.expenseCategoryBreakdown.map((c) => ({
        category_id: c.categoryId,
        category_name: c.categoryName,
        amount: c.amount,
        percentage: c.percentage,
        color: c.color,
        is_essential: ['rent', 'food', 'bills', 'transport', 'healthcare'].includes(c.categoryName.toLowerCase()),
        transaction_count: c.count
      })),
      top_5_categories: top5Cats,
      top_5_expenses: top5Expenses,
      comparison: [
        {
          key: 'income',
          label: 'Total Income',
          current_value: data.currentMonthTotals.income,
          previous_value: data.prevMonthTotals.income,
          change_amount: data.currentMonthTotals.income - data.prevMonthTotals.income,
          change_pct: data.comparison.incomePctChange,
          change_label: data.comparison.incomePctChange >= 0 ? `+${data.comparison.incomePctChange}%` : `${data.comparison.incomePctChange}%`,
          is_good: data.comparison.incomePctChange >= 0,
          formatted_current: `₹${data.currentMonthTotals.income.toLocaleString('en-IN')}`,
          formatted_previous: `₹${data.prevMonthTotals.income.toLocaleString('en-IN')}`
        },
        {
          key: 'expenses',
          label: 'Total Expenses',
          current_value: data.currentMonthTotals.expenses,
          previous_value: data.prevMonthTotals.expenses,
          change_amount: data.currentMonthTotals.expenses - data.prevMonthTotals.expenses,
          change_pct: data.comparison.expensePctChange,
          change_label: data.comparison.expensePctChange >= 0 ? `+${data.comparison.expensePctChange}%` : `${data.comparison.expensePctChange}%`,
          is_good: data.comparison.expensePctChange <= 0,
          formatted_current: `₹${data.currentMonthTotals.expenses.toLocaleString('en-IN')}`,
          formatted_previous: `₹${data.prevMonthTotals.expenses.toLocaleString('en-IN')}`
        },
        {
          key: 'savings',
          label: 'Net Savings',
          current_value: data.currentMonthTotals.savings,
          previous_value: data.prevMonthTotals.savings,
          change_amount: data.currentMonthTotals.savings - data.prevMonthTotals.savings,
          change_pct: data.comparison.savingsPctChange,
          change_label: data.comparison.savingsPctChange >= 0 ? `+${data.comparison.savingsPctChange}%` : `${data.comparison.savingsPctChange}%`,
          is_good: data.comparison.savingsPctChange >= 0,
          formatted_current: `₹${data.currentMonthTotals.savings.toLocaleString('en-IN')}`,
          formatted_previous: `₹${data.prevMonthTotals.savings.toLocaleString('en-IN')}`
        },
        {
          key: 'savings_rate',
          label: 'Savings Rate',
          current_value: data.currentMonthTotals.savingsRate,
          previous_value: data.prevMonthTotals.savingsRate,
          change_amount: Math.round((data.currentMonthTotals.savingsRate - data.prevMonthTotals.savingsRate) * 10) / 10,
          change_pct: null,
          change_label: `${data.currentMonthTotals.savingsRate}%`,
          is_good: data.currentMonthTotals.savingsRate >= data.prevMonthTotals.savingsRate,
          formatted_current: `${data.currentMonthTotals.savingsRate}%`,
          formatted_previous: `${data.prevMonthTotals.savingsRate}%`
        }
      ]
    };
  }

  public getNotificationsPayload(): any {
    const data = this.getSampleData();
    return {
      unread_count: data.notifications.length,
      total_count: data.notifications.length,
      has_more: false,
      items: data.notifications
    };
  }
}

export const sampleDataManager = new SampleDataManager();
