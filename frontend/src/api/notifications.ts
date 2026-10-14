import api from './client';

export interface NotificationDetails {
  category_name?: string | null;
  spent_amount?: number | null;
  limit_amount?: number | null;
  percentage_used?: number | null;
  goal_title?: string | null;
  saved_amount?: number | null;
  target_amount?: number | null;
  goal_percentage?: number | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  budget_id?: string | null;
  goal_id?: string | null;
  type: 'budget_80' | 'budget_100' | 'goal_milestone' | 'goal_deadline' | 'monthly_report' | 'system' | string;
  title?: string | null;
  message: string;
  target_tab?: string;
  is_read: boolean;
  email_sent_at?: string | null;
  created_at: string;
  details?: NotificationDetails | null;
}

export interface NotificationsResponse {
  unread_count: number;
  total_count: number;
  has_more?: boolean;
  items: NotificationItem[];
}

export const fetchNotifications = async (
  offset = 0,
  limit = 20,
  onlyUnread = false
): Promise<NotificationsResponse> => {
  const res = await api.get('/user/notifications', {
    params: { offset, limit, only_unread: onlyUnread }
  });
  return res.data;
};

export const markNotificationRead = async (id: string): Promise<NotificationItem> => {
  const res = await api.patch(`/user/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async (): Promise<{ count: number }> => {
  const res = await api.post('/user/notifications/mark-all-read');
  return res.data;
};

export const deleteNotification = async (id: string): Promise<{ message: string }> => {
  const res = await api.delete(`/user/notifications/${id}`);
  return res.data;
};

export const clearAllNotifications = async (): Promise<{ message: string; count: number }> => {
  const res = await api.delete('/user/notifications/clear-all');
  return res.data;
};
