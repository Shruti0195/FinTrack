import api from './client';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  type: string;
  month: number;
  year: number;
  limit_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  status: 'safe' | 'warning' | 'exceeded';
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  month: number;
  year: number;
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
}

export interface BudgetUpdateInput {
  limit_amount: number;
}

export const getBudgets = async (month?: number, year?: number): Promise<Budget[]> => {
  const params: Record<string, number> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const res = await api.get<Budget[]>('/user/budgets', { params });
  return res.data;
};

export const getBudgetSummary = async (month?: number, year?: number): Promise<BudgetSummary> => {
  const params: Record<string, number> = {};
  if (month) params.month = month;
  if (year) params.year = year;
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
