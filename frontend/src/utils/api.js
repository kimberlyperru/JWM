import axios from 'axios';

function getBaseURL() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return 'https://jwm-backend.onrender.com/api';
  }
  return '/api';
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwm_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.code === 'ECONNABORTED') {
      err.userMessage = 'Request timed out. Server may be waking up — try again in 30 seconds.';
    } else if (!err.response) {
      err.userMessage = 'Cannot reach the server. Check your connection.';
    }
    return Promise.reject(err);
  }
);

export const getSlots            = (date) => api.get(`/appointments/slots?date=${date}`);
export const bookAppointment     = (data) => api.post('/appointments/book', data);
export const registerMember      = (data) => api.post('/members/register', data);
export const submitPledge        = (data) => api.post('/pledges/submit', data);
export const initiateMpesa       = (data) => api.post('/mpesa/stkpush', data);
export const queryPaymentStatus  = (id)   => api.get(`/mpesa/query/${id}`);
export const checkPaymentStatus  = (id)   => api.get(`/mpesa/status/${id}`);
export const adminLogin          = (data) => api.post('/auth/login', data);
export const verifyToken         = ()     => api.get('/auth/verify');
export const getAdminAppointments= () => api.get('/admin/appointments');
export const getAdminMembers     = () => api.get('/admin/members');
export const getAdminPledges     = () => api.get('/admin/pledges');
export const getAdminPayments    = () => api.get('/admin/payments');
export const getAdminSummary     = () => api.get('/admin/summary');
export const deleteAdminRecord   = (type, id) => api.delete(`/admin/${type}/${id}`);
export const downloadPDF         = (type) => api.get(`/pdf/${type}`, { responseType: 'blob' });

export default api;
