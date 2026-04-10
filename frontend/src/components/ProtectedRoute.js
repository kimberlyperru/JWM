import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { verifyToken } from '../utils/api';

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'denied'

  useEffect(() => {
    const token = localStorage.getItem('jwm_admin_token');
    if (!token) { setStatus('denied'); return; }
    verifyToken()
      .then(() => setStatus('ok'))
      .catch(() => { localStorage.removeItem('jwm_admin_token'); setStatus('denied'); });
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span className="spinner" style={{ borderTopColor: 'var(--primary)', border: '4px solid var(--border)' }}></span>
      </div>
    );
  }
  if (status === 'denied') return <Navigate to="/admin" replace />;
  return children;
}

export default ProtectedRoute;
