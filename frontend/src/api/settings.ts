import api from './client';

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  message: string;
  access_token: string;
  token_type: string;
  success: boolean;
}

export const changeUserPassword = async (payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<ChangePasswordResponse> => {
  const response = await api.post<ChangePasswordResponse>('/user/settings/change-password', payload);
  return response.data;
};

export const requestPasswordReset = async (email: string): Promise<{ message: string; success: boolean }> => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};
