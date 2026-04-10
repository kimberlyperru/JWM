import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwm_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Appointments ----
export const getSlots = (date) => api.get(`/appointments/slots?date=${date}`);
export const bookAppointment = (data) => api.post('/appointments/book', data);

// ---- Members ----
export const registerMember = (data) => api.post('/members/register', data);

// ---- Pledges ----
export const submitPledge = (data) => api.post('/pledges/submit', data);

// ---- M-Pesa ----
export const initiateMpesa = (data) => api.post('/mpesa/stkpush', data);
export const checkPaymentStatus = (id) => api.get(`/mpesa/status/${id}`);

// ---- Auth ----
export const adminLogin = (data) => api.post('/auth/login', data);
export const verifyToken = () => api.get('/auth/verify');

// ---- Admin ----
export const getAdminAppointments = () => api.get('/admin/appointments');
export const getAdminMembers = () => api.get('/admin/members');
export const getAdminPledges = () => api.get('/admin/pledges');
export const getAdminPayments = () => api.get('/admin/payments');
export const getAdminSummary = () => api.get('/admin/summary');
export const deleteAdminRecord = (type, id) => api.delete(`/admin/${type}/${id}`);
export const downloadPDF = (type) =>
  api.get(`/pdf/${type}`, { responseType: 'blob' });

export default api;
