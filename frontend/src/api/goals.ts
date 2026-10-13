import api from './client';

export interface GoalContribution {
  id: string;
  goal_id: string;
  amount: number;
  note?: string | null;
  contributed_at: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  remaining_amount: number;
  percentage: number;
  deadline?: string | null;
  days_remaining?: number | null;
  suggested_monthly_savings: number;
  color: string;
  icon: string;
  status: 'active' | 'completed';
  cheering_message: string;
  contributions: GoalContribution[];
  created_at: string;
  updated_at: string;
}

export interface GoalSummary {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_target_amount: number;
  total_saved_amount: number;
  overall_percentage: number;
}

export interface GoalCreateInput {
  title: string;
  target_amount: number;
  deadline?: string;
  months?: number;
  color?: string;
  icon?: string;
}

export interface GoalUpdateInput {
  title?: string;
  target_amount?: number;
  deadline?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'completed';
}

export interface ContributionCreateInput {
  amount: number;
  note?: string;
  contributed_at?: string;
}

export interface ContributionUpdateInput {
  amount?: number;
  note?: string;
  contributed_at?: string;
}

export const getGoals = async (status?: 'active' | 'completed'): Promise<Goal[]> => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const res = await api.get<Goal[]>('/user/goals', { params });
  return res.data;
};

export const getGoalsSummary = async (): Promise<GoalSummary> => {
  const res = await api.get<GoalSummary>('/user/goals/summary');
  return res.data;
};

export const createGoal = async (data: GoalCreateInput): Promise<Goal> => {
  const res = await api.post<Goal>('/user/goals', data);
  return res.data;
};

export const getGoalDetail = async (goalId: string): Promise<Goal> => {
  const res = await api.get<Goal>(`/user/goals/${goalId}`);
  return res.data;
};

export const updateGoal = async (goalId: string, data: GoalUpdateInput): Promise<Goal> => {
  const res = await api.put<Goal>(`/user/goals/${goalId}`, data);
  return res.data;
};

export const deleteGoal = async (goalId: string): Promise<{ message: string; id: string }> => {
  const res = await api.delete<{ message: string; id: string }>(`/user/goals/${goalId}`);
  return res.data;
};

export const addGoalContribution = async (goalId: string, data: ContributionCreateInput): Promise<Goal> => {
  const res = await api.post<Goal>(`/user/goals/${goalId}/contributions`, data);
  return res.data;
};

export const updateGoalContribution = async (
  goalId: string,
  contributionId: string,
  data: ContributionUpdateInput
): Promise<Goal> => {
  const res = await api.put<Goal>(`/user/goals/${goalId}/contributions/${contributionId}`, data);
  return res.data;
};

export const deleteGoalContribution = async (
  goalId: string,
  contributionId: string
): Promise<Goal> => {
  const res = await api.delete<Goal>(`/user/goals/${goalId}/contributions/${contributionId}`);
  return res.data;
};
