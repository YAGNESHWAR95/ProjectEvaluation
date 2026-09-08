import api from './api';

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

// Securely download CSV export via authenticated API call (no token in URL)
export const downloadExportReport = async () => {
  const response = await api.get('/admin/reports/export', {
    responseType: 'blob',
  });

  // Create a temporary download link and trigger the browser download
  const blob = new Blob([response.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'evaluations_report.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
