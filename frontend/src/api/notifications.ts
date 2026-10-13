import api from './client';

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
}

export interface NotificationsResponse {
  unread_count: number;
  total_count: number;
  items: NotificationItem[];
}

export const fetchNotifications = async (onlyUnread = false, limit = 50): Promise<NotificationsResponse> => {
  const res = await api.get('/user/notifications', {
    params: { only_unread: onlyUnread, limit }
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
