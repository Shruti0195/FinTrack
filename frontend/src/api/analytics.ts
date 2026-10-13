import api from './client';

export interface HealthScoreFactor {
  name: string;
  earned_points: number;
  max_points: number;
  is_calculated: boolean;
  user_figure_text: string;
  rule_explanation: string;
  not_calculated_reason?: string | null;
}

export interface FinancialHealthScoreData {
  score: number | null;
  status_label: string;
  status_color: string;
  factors_calculated_count: number;
  total_factors_count: number;
  score_notes: string[];
  improvement_line: string;
  missing_factor_note?: string | null;
  explanation_summary: string;
  factors: HealthScoreFactor[];
}

export interface SpendingSavingTrendPoint {
  month: number;
  month_name: string;
  year: number;
  income: number;
  expenses: number;
  savings: number;
  savings_rate: number;
}

export interface SpendingSavingTrends {
  monthly_trends: SpendingSavingTrendPoint[];
  savings_takeaway: string;
  healthy_savings_range_min: number;
  healthy_savings_range_max: number;
}

export interface CategoryExpenseMix {
  category_id?: string | null;
  category_name: string;
  amount: number;
  percentage: number;
  color: string;
  is_essential: boolean;
  transaction_count: number;
}

export interface TopSingleExpense {
  id: string;
  description: string;
  category_name: string;
  amount: number;
  transaction_date: string;
}

export interface PeriodComparisonMetric {
  key: string;
  label: string;
  current_value: number;
  previous_value: number;
  change_amount: number;
  change_pct?: number | null;
  change_label: string;
  is_good: boolean;
  formatted_current: string;
  formatted_previous: string;
}

export interface AnalyticsOverviewResponse {
  period_type: string;
  period_label: string;
  year: number;
  month?: number | null;
  quarter?: number | null;
  half?: number | null;
  has_enough_data: boolean;
  health_score: FinancialHealthScoreData;
  trends: SpendingSavingTrends;
  expense_mix: CategoryExpenseMix[];
  top_5_categories: CategoryExpenseMix[];
  top_5_expenses: TopSingleExpense[];
  comparison: PeriodComparisonMetric[];
}

export async function fetchAnalyticsOverview(params: {
  period_type: string;
  year: number;
  month?: number;
  quarter?: number;
  half?: number;
}): Promise<AnalyticsOverviewResponse> {
  const res = await api.get('/user/analytics/overview', { params });
  return res.data;
}
