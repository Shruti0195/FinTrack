import api from './client';

export type BudgetPeriodType = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  type: string;
  month?: number | null;
  year: number;
  limit_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  status: 'safe' | 'warning' | 'exceeded';
  period_type?: BudgetPeriodType;
  period_label?: string;
  months_budgeted?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetSummary {
  month?: number | null;
  year: number;
  period_type: BudgetPeriodType;
  period_label: string;
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  overall_percentage: number;
  budget_count: number;
  safe_count: number;
  warning_count: number;
  exceeded_count: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  type: string;
}

export interface BudgetCreateInput {
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
  apply_to_period?: 'single_month' | 'quarter' | 'half_year' | 'year';
}

export interface BudgetUpdateInput {
  limit_amount: number;
}

export interface BudgetQueryParams {
  period_type?: BudgetPeriodType;
  period_value?: number;
  month?: number;
  year?: number;
}

export const getBudgets = async (paramsObj?: BudgetQueryParams): Promise<Budget[]> => {
  const params: Record<string, string | number> = {};
  if (paramsObj?.period_type) params.period_type = paramsObj.period_type;
  if (paramsObj?.period_value) params.period_value = paramsObj.period_value;
  if (paramsObj?.month) params.month = paramsObj.month;
  if (paramsObj?.year) params.year = paramsObj.year;

  const res = await api.get<Budget[]>('/user/budgets', { params });
  return res.data;
};

export const getBudgetSummary = async (paramsObj?: BudgetQueryParams): Promise<BudgetSummary> => {
  const params: Record<string, string | number> = {};
  if (paramsObj?.period_type) params.period_type = paramsObj.period_type;
  if (paramsObj?.period_value) params.period_value = paramsObj.period_value;
  if (paramsObj?.month) params.month = paramsObj.month;
  if (paramsObj?.year) params.year = paramsObj.year;

  const res = await api.get<BudgetSummary>('/user/budgets/summary', { params });
  return res.data;
};

export const getBudgetCategories = async (): Promise<BudgetCategory[]> => {
  const res = await api.get<BudgetCategory[]>('/user/budgets/categories');
  return res.data;
};

export const createBudget = async (data: BudgetCreateInput): Promise<Budget> => {
  const res = await api.post<Budget>('/user/budgets', data);
  return res.data;
};

export const updateBudget = async (budgetId: string, data: BudgetUpdateInput): Promise<Budget> => {
  const res = await api.put<Budget>(`/user/budgets/${budgetId}`, data);
  return res.data;
};

export const deleteBudget = async (budgetId: string): Promise<{ message: string; id: string }> => {
  const res = await api.delete<{ message: string; id: string }>(`/user/budgets/${budgetId}`);
  return res.data;
};
