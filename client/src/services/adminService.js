import api from './api';
import { API_BASE_URL } from '../utils/constants';

export const getStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data.data;
};

export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data.users;
};

export const createUser = async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data.user;
};

export const getDeadlines = async () => {
  const response = await api.get('/deadlines');
  return response.data.deadlines;
};

export const createDeadline = async (deadlineData) => {
  const response = await api.post('/deadlines', deadlineData);
  return response.data.deadline;
};

export const getExportReportUrl = () => {
  const token = localStorage.getItem('token');
  return `${API_BASE_URL}/admin/reports/export?token=${token}`;
};
