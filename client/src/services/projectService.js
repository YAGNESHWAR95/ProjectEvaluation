import api from './api';
import axios from 'axios';

// Get list of projects based on logged-in user role
export const getProjects = async () => {
  const response = await api.get('/projects');
  return response.data.projects;
};

// Get specific project details
export const getProjectById = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data.project;
};

// Request direct-upload presigned signature
export const getUploadUrl = async (filename, fileType) => {
  const response = await api.get(`/projects/upload-url`, {
    params: { filename, fileType },
  });
  return response.data.data;
};

// Perform direct upload to cloud bucket / local direct target
export const uploadFileDirectly = async (uploadMetadata, file, onProgress) => {
  const { uploadUrl, method, fields, fileKey } = uploadMetadata;
  
  const formData = new FormData();
  
  // Append presigned fields
  if (fields) {
    Object.keys(fields).forEach(key => {
      formData.append(key, fields[key]);
    });
  }
  
  // Append binary file
  formData.append(fileKey || 'file', file);

  // Build headers — include auth token for local server uploads
  const headers = { 'Content-Type': 'multipart/form-data' };
  const token = sessionStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await axios({
    url: uploadUrl,
    method: method || 'POST',
    data: formData,
    headers,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return response.data; // Yields { url, hash, originalName }
};

// Submit metadata register call
export const submitProject = async (projectData) => {
  const response = await api.post('/projects/submit', projectData);
  return response.data.project;
};

// Admin allocation call
export const assignReviewer = async (projectId, facultyId) => {
  const response = await api.post('/projects/assign-reviewer', { projectId, facultyId });
  return response.data.project;
};

// Get students list (for team member selection)
export const getStudents = async () => {
  const response = await api.get('/projects/students');
  return response.data.users;
};
