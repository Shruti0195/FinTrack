import api from './client';

export interface UserGrowthPoint {
  date: string;
  count: number;
}

export interface ReportedIssueSummary {
  id: string;
  report_number?: number;
  title: string;
  description?: string;
  report_type?: string;
  page?: string;
  status: string;
  created_at: string;
  reporter_name?: string;
  reporter_email?: string;
}

export interface RecentUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface TopCategorySummary {
  id: string;
  name: string;
  type: string;
  transaction_count: number;
}

export interface AdminMetrics {
  total_users: number;
  total_categories: number;
  income_categories: number;
  expense_categories: number;
  recent_users?: RecentUserSummary[];
  top_income_categories?: TopCategorySummary[];
  top_expense_categories?: TopCategorySummary[];
  latest_issues: ReportedIssueSummary[];
  total_goals?: number;
  total_transactions?: number;
}

export const fetchAdminMetrics = async (): Promise<AdminMetrics> => {
  const response = await api.get<AdminMetrics>('/admin/overview/metrics');
  return response.data;
};

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  users: AdminUserItem[];
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: 'all' | 'active' | 'disabled';
  sort_by?: 'created_at' | 'name' | 'email' | 'status';
  sort_order?: 'asc' | 'desc';
}

export const fetchAdminUsers = async (params: UserListParams = {}): Promise<AdminUsersResponse> => {
  const response = await api.get<AdminUsersResponse>('/admin/users', { params });
  return response.data;
};

export const updateAdminUserStatus = async (userId: string, isActive: boolean): Promise<AdminUserItem> => {
  const response = await api.patch<AdminUserItem>(`/admin/users/${userId}/status`, {
    is_active: isActive
  });
  return response.data;
};

export const resendAdminUserVerification = async (userId: string): Promise<{ message: string; success: boolean }> => {
  const response = await api.post<{ message: string; success: boolean }>(`/admin/users/${userId}/resend-verification`);
  return response.data;
};

export const sendAdminUserPasswordReset = async (userId: string): Promise<{ message: string; success: boolean }> => {
  const response = await api.post<{ message: string; success: boolean }>(`/admin/users/${userId}/send-password-reset`);
  return response.data;
};

export interface AdminCategoryItem {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  transaction_count: number;
  created_at?: string;
}

export const fetchAdminCategories = async (type?: 'expense' | 'income' | 'all'): Promise<AdminCategoryItem[]> => {
  const response = await api.get<AdminCategoryItem[]>('/admin/categories', {
    params: type && type !== 'all' ? { type } : {}
  });
  return response.data;
};

export const createAdminCategory = async (
  name: string,
  type: 'expense' | 'income' = 'expense'
): Promise<AdminCategoryItem> => {
  const response = await api.post<AdminCategoryItem>('/admin/categories', { name, type });
  return response.data;
};

export const updateAdminCategory = async (categoryId: string, name: string): Promise<AdminCategoryItem> => {
  const response = await api.put<AdminCategoryItem>(`/admin/categories/${categoryId}`, { name });
  return response.data;
};

export const deleteAdminCategory = async (
  categoryId: string,
  targetCategoryId?: string
): Promise<{ success: boolean; message: string; reassigned_transactions: number; reassigned_budgets: number }> => {
  const response = await api.delete(`/admin/categories/${categoryId}`, {
    data: targetCategoryId ? { target_category_id: targetCategoryId } : {}
  });
  return response.data;
};

// ========================
// Issues / Reports
// ========================

export interface AdminIssueListItem {
  id: string;
  report_number: number;
  title: string;
  description: string;
  report_type: string;
  page?: string | null;
  status: 'Open' | 'In progress' | 'Resolved' | 'Closed' | string;
  closed_reason?: string | null;
  admin_reply?: string | null;
  created_at: string;
  updated_at: string;
  reporter_name: string;
  reporter_email: string;
}

export interface AdminIssueCounts {
  all: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface AdminIssuesResponse {
  counts: AdminIssueCounts;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AdminIssueListItem[];
}

export interface AdminIssueNoteItem {
  id: string;
  admin_name: string;
  note: string;
  created_at: string;
}

export interface AdminIssueHistoryItem {
  id: string;
  actor_type: string;
  actor_name: string;
  event_type: string;
  old_status?: string | null;
  new_status?: string | null;
  message?: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface AdminIssueDetailItem extends AdminIssueListItem {
  notes: AdminIssueNoteItem[];
  history: AdminIssueHistoryItem[];
}

export interface AdminIssueFilterParams {
  status?: string;
  search?: string;
  type?: string;
  page_filter?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  page_size?: number;
}

export const fetchAdminIssues = async (params: AdminIssueFilterParams = {}): Promise<AdminIssuesResponse> => {
  const response = await api.get<AdminIssuesResponse>('/admin/issues', { params });
  return response.data;
};

export const fetchAdminIssueDetail = async (issueId: string): Promise<AdminIssueDetailItem> => {
  const response = await api.get<AdminIssueDetailItem>(`/admin/issues/${issueId}`);
  return response.data;
};

export const updateAdminIssue = async (
  issueId: string,
  data: {
    status?: string;
    closed_reason?: string;
    reply?: string;
    last_updated_at?: string;
  }
): Promise<AdminIssueDetailItem> => {
  const response = await api.patch<AdminIssueDetailItem>(`/admin/issues/${issueId}`, data);
  return response.data;
};

export const createAdminIssueNote = async (
  issueId: string,
  note: string
): Promise<AdminIssueNoteItem> => {
  const response = await api.post<AdminIssueNoteItem>(`/admin/issues/${issueId}/notes`, { note });
  return response.data;
};

export const reopenAdminIssue = async (issueId: string): Promise<AdminIssueDetailItem> => {
  const response = await api.post<AdminIssueDetailItem>(`/admin/issues/${issueId}/reopen`);
  return response.data;
};

export const deleteSpamAdminIssue = async (issueId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/admin/issues/${issueId}`);
  return response.data;
};

export const runRetentionCleanup = async (): Promise<{ success: boolean; removed_count: number; message: string }> => {
  const response = await api.post('/admin/issues/cleanup-retention');
  return response.data;
};

// ========================
// Goal Options (Icons & Colors)
// ========================

export interface AdminGoalIconItem {
  id: string;
  name: string;
  icon_key: string;
  is_default: boolean;
  goal_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminGoalColorItem {
  id: string;
  name: string;
  hex: string;
  is_default: boolean;
  goal_count: number;
  created_at: string;
  updated_at: string;
}

export const fetchAdminGoalIcons = async (): Promise<AdminGoalIconItem[]> => {
  const response = await api.get<AdminGoalIconItem[]>('/admin/goals/icons');
  return response.data;
};

export const createAdminGoalIcon = async (
  name: string,
  icon_key: string
): Promise<AdminGoalIconItem> => {
  const response = await api.post<AdminGoalIconItem>('/admin/goals/icons', { name, icon_key });
  return response.data;
};

export const updateAdminGoalIcon = async (
  iconId: string,
  data: { name?: string; icon_key?: string }
): Promise<AdminGoalIconItem> => {
  const response = await api.put<AdminGoalIconItem>(`/admin/goals/icons/${iconId}`, data);
  return response.data;
};

export const deleteAdminGoalIcon = async (
  iconId: string,
  targetIconId?: string
): Promise<{ success: boolean; message: string; reassigned_goals: number }> => {
  const response = await api.delete(`/admin/goals/icons/${iconId}`, {
    data: targetIconId ? { target_icon_id: targetIconId } : {}
  });
  return response.data;
};

export const fetchAdminGoalColors = async (): Promise<AdminGoalColorItem[]> => {
  const response = await api.get<AdminGoalColorItem[]>('/admin/goals/colors');
  return response.data;
};

export const createAdminGoalColor = async (
  name: string,
  hex: string
): Promise<AdminGoalColorItem> => {
  const response = await api.post<AdminGoalColorItem>('/admin/goals/colors', { name, hex });
  return response.data;
};

export const updateAdminGoalColor = async (
  colorId: string,
  data: { name?: string; hex?: string }
): Promise<AdminGoalColorItem> => {
  const response = await api.put<AdminGoalColorItem>(`/admin/goals/colors/${colorId}`, data);
  return response.data;
};

export const deleteAdminGoalColor = async (
  colorId: string,
  targetColorId?: string
): Promise<{ success: boolean; message: string; reassigned_goals: number }> => {
  const response = await api.delete(`/admin/goals/colors/${colorId}`, {
    data: targetColorId ? { target_color_id: targetColorId } : {}
  });
  return response.data;
};
