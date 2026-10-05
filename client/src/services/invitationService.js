import api from './api';

export const sendInvitation = async (projectId, email) => {
  const response = await api.post('/team-invitations/send', { projectId, email });
  return response.data;
};

export const getMyInvitations = async () => {
  const response = await api.get('/team-invitations/my');
  return response.data.invitations;
};

export const getLeaderInvitations = async () => {
  const response = await api.get('/team-invitations/leader');
  return response.data.invitations;
};

export const acceptInvitation = async (token) => {
  const response = await api.post(`/team-invitations/${token}/accept`);
  return response.data;
};

export const rejectInvitation = async (token) => {
  const response = await api.post(`/team-invitations/${token}/reject`);
  return response.data;
};
