import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../utils/api';
import './AdminLogin.css';

function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminLogin(form);
      localStorage.setItem('jwm_admin_token', res.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/images/apple-touch-icon.png" alt="JWM Logo" />
        </div>
        <h2>Admin Login</h2>
        <p>Jesus Winner Ministry — Kajiado Branch</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-icon-wrap">
              <i className="fas fa-user"></i>
              <input
                type="text" placeholder="Enter username" required
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrap">
              <i className="fas fa-lock"></i>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter password" required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? <><span className="spinner"></span> Logging in...</> : 'Login'}
          </button>
        </form>

        <p className="back-link">
          <a href="/">← Back to Website</a>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
