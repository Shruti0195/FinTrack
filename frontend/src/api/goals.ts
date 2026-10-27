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
  has_custom_alerts?: boolean;
  custom_milestone_thresholds?: number[] | null;
  custom_deadline_reminder_days?: number | null;
  custom_inactivity_nudge_days?: number | null;
  custom_alert_in_app?: boolean | null;
  custom_alert_email?: boolean | null;
  contributions: GoalContribution[];
  created_at: string;
  updated_at: string;
}

export interface GoalAlertSettings {
  milestone_thresholds: number[];
  deadline_reminder_days: number | null;
  inactivity_nudge_days: number | null;
  in_app: boolean;
  email: boolean;
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
  has_custom_alerts?: boolean;
  custom_milestone_thresholds?: number[] | null;
  custom_deadline_reminder_days?: number | null;
  custom_inactivity_nudge_days?: number | null;
  custom_alert_in_app?: boolean | null;
  custom_alert_email?: boolean | null;
}

export interface GoalUpdateInput {
  title?: string;
  target_amount?: number;
  deadline?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'completed';
  has_custom_alerts?: boolean;
  custom_milestone_thresholds?: number[] | null;
  custom_deadline_reminder_days?: number | null;
  custom_inactivity_nudge_days?: number | null;
  custom_alert_in_app?: boolean | null;
  custom_alert_email?: boolean | null;
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

export const getGoalAlertSettings = async (): Promise<GoalAlertSettings> => {
  const res = await api.get<GoalAlertSettings>('/user/goals/alert-settings');
  return res.data;
};

export const updateGoalAlertSettings = async (data: GoalAlertSettings): Promise<GoalAlertSettings> => {
  const res = await api.put<GoalAlertSettings>('/user/goals/alert-settings', data);
  return res.data;
};

export interface GoalAlertPauseStatus {
  is_paused: boolean;
  paused_until?: string | null;
}

export const getGoalAlertPauseStatus = async (): Promise<GoalAlertPauseStatus> => {
  const res = await api.get<GoalAlertPauseStatus>('/user/goals/alerts/status');
  return res.data;
};

export const pauseGoalAlerts = async (
  duration: '1_day' | '1_week' | '1_month' | 'indefinite'
): Promise<GoalAlertPauseStatus> => {
  const res = await api.post<GoalAlertPauseStatus>('/user/goals/alerts/pause', { duration });
  return res.data;
};

export const resumeGoalAlerts = async (): Promise<GoalAlertPauseStatus> => {
  const res = await api.post<GoalAlertPauseStatus>('/user/goals/alerts/resume');
  return res.data;
};

export const updateGoalCardAlerts = async (
  goalId: string,
  data: {
    milestone_thresholds: number[];
    deadline_reminder_days: number | null;
    inactivity_nudge_days: number | null;
    in_app: boolean;
    email: boolean;
    apply_to_all?: boolean;
  }
): Promise<Goal> => {
  const res = await api.put<Goal>(`/user/goals/${goalId}/alerts`, data);
  return res.data;
};
