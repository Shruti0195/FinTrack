import api from './client';

export interface ChecklistStatus {
  has_income: boolean;
  has_expense: boolean;
  has_budget: boolean;
  has_goal: boolean;
  has_viewed_analytics: boolean;
  completed_count: number;
  total_count: number;
  all_completed: boolean;
  is_dismissed: boolean;
}

export type ReportType = 'Something is broken' | 'I have a question' | 'I have a suggestion';

export interface SupportReportItem {
  id: string;
  report_number: number;
  report_type: ReportType;
  title: string;
  description: string;
  page?: string | null;
  status: 'Open' | 'In progress' | 'Resolved' | 'Closed' | string;
  closed_reason?: string | null;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserReportHistoryItem {
  id: string;
  actor_name: string;
  event_type: string;
  old_status?: string | null;
  new_status?: string | null;
  message?: string | null;
  created_at: string;
}

export interface UserReportDetail extends SupportReportItem {
  history: UserReportHistoryItem[];
}

export interface SupportReportCreatePayload {
  report_type: ReportType;
  title: string;
  description: string;
  page?: string | null;
}

export const fetchChecklistStatus = async (): Promise<ChecklistStatus> => {
  const response = await api.get<ChecklistStatus>('/user/help/checklist');
  return response.data;
};

export const dismissChecklist = async (): Promise<{ message: string; success: boolean }> => {
  const response = await api.post('/user/help/dismiss-checklist');
  return response.data;
};

export const trackAnalyticsViewed = async (): Promise<{ message: string; success: boolean }> => {
  const response = await api.post('/user/help/track-analytics');
  return response.data;
};

export const fetchSupportReports = async (): Promise<SupportReportItem[]> => {
  const response = await api.get<SupportReportItem[]>('/user/help/reports');
  return response.data;
};

export const fetchSupportReportDetail = async (id: string): Promise<UserReportDetail> => {
  const response = await api.get<UserReportDetail>(`/user/help/reports/${id}`);
  return response.data;
};

export const createSupportReport = async (payload: SupportReportCreatePayload): Promise<SupportReportItem> => {
  const response = await api.post<SupportReportItem>('/user/help/reports', payload);
  return response.data;
};
