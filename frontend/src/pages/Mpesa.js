import React, { useState, useEffect, useRef } from 'react';
import { initiateMpesa, checkPaymentStatus } from '../utils/api';
import './Mpesa.css';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

function Mpesa() {
  const [form, setForm] = useState({ phone: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState(null); // null | 'waiting' | 'success' | 'failed'
  const [checkoutId, setCheckoutId] = useState(null);
  const pollRef = useRef(null);

  // Poll payment status every 3 seconds after STK push
  useEffect(() => {
    if (status === 'waiting' && checkoutId) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await checkPaymentStatus(checkoutId);
          if (res.data.status === 'Success') {
            clearInterval(pollRef.current);
            setStatus('success');
          }
        } catch { /* keep polling */ }
      }, 3000);
      // Stop polling after 90 seconds
      const timeout = setTimeout(() => {
        clearInterval(pollRef.current);
        if (status === 'waiting') setStatus('failed');
      }, 90000);
      return () => { clearInterval(pollRef.current); clearTimeout(timeout); };
    }
  }, [status, checkoutId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await initiateMpesa(form);
      setCheckoutId(res.data.checkoutRequestId);
      setStatus('waiting');
      setMessage({ type: 'info', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Payment initiation failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus(null); setCheckoutId(null);
    setForm({ phone: '', amount: '' }); setMessage(null);
  };

  if (status === 'success') {
    return (
      <div className="mpesa-page">
        <div className="page-hero">
          <h1><i className="fas fa-hand-holding-heart"></i> Give (M-Pesa)</h1>
          <p>Support the ministry through your generous giving</p>
        </div>
        <section className="section">
          <div className="mpesa-success">
            <div className="success-animation">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Payment Successful!</h2>
            <p className="success-msg">Thank you! God bless you.</p>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.95rem', marginBottom: 28 }}>
              Your generous giving supports the Gospel and transforms lives in Kajiado and beyond.
            </p>
            <p className="scripture-verse">
              "Give, and it will be given to you. A good measure, pressed down, shaken together
              and running over, will be poured into your lap." — Luke 6:38
            </p>
            <button className="btn btn-primary" onClick={reset} style={{ marginTop: 20 }}>
              Make Another Payment
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="mpesa-page">
        <div className="page-hero">
          <h1><i className="fas fa-mobile-alt"></i> Payment Pending</h1>
          <p>Please check your phone</p>
        </div>
        <section className="section">
          <div className="mpesa-waiting">
            <div className="phone-animation">
              <i className="fas fa-mobile-alt"></i>
              <div className="ping-ring"></div>
            </div>
            <h2>Check Your Phone</h2>
            <p>A payment prompt has been sent to <strong>{form.phone}</strong>.</p>
            <p>Please enter your <strong>M-Pesa PIN</strong> to complete the payment of <strong>KES {Number(form.amount).toLocaleString()}</strong>.</p>
            <div className="waiting-steps">
              <div className="w-step">
                <span className="w-num">1</span>
                <span>Check the M-Pesa notification on your phone</span>
              </div>
              <div className="w-step">
                <span className="w-num">2</span>
                <span>Enter your M-Pesa PIN when prompted</span>
              </div>
              <div className="w-step">
                <span className="w-num">3</span>
                <span>Wait for confirmation — this page will update automatically</span>
              </div>
            </div>
            <div className="polling-indicator">
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }}></span>
              Waiting for payment confirmation...
            </div>
            <button className="btn btn-outline" onClick={reset} style={{ marginTop: 20 }}>
              Cancel & Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mpesa-page">
      <div className="page-hero">
        <h1><i className="fas fa-hand-holding-heart"></i> Give (M-Pesa)</h1>
        <p>Support the ministry through your generous giving</p>
      </div>

      <section className="section">
        <div className="mpesa-container">
          {/* Manual Paybill option */}
          <div className="paybill-card">
            <h3><i className="fas fa-mobile-alt"></i> Give via Paybill</h3>
            <div className="paybill-details">
              <div className="paybill-item">
                <span>Paybill Number</span>
                <strong>400200</strong>
              </div>
              <div className="paybill-item">
                <span>Account Number</span>
                <strong>32233</strong>
              </div>
            </div>
            <p className="paybill-hint">Go to M-Pesa → Lipa na M-Pesa → Pay Bill</p>
          </div>

          <div className="divider"><span>OR</span></div>

          {/* STK Push form */}
          <div className="form-card" style={{ maxWidth: '100%' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: 6 }}>
              <i className="fas fa-bolt"></i> Quick Pay (STK Push)
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginBottom: 20 }}>
              Enter your number and amount — we'll send a payment prompt directly to your phone.
            </p>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>M-Pesa Phone Number *</label>
                <input
                  type="tel" placeholder="e.g. 0712 345 678" required
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                />
                <small style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                  Safaricom number registered with M-Pesa
                </small>
              </div>

              <div className="form-group">
                <label>Amount (KES) *</label>
                <div className="quick-amounts">
                  {QUICK_AMOUNTS.map(amt => (
                    <button
                      type="button" key={amt}
                      className={`quick-amount-btn${form.amount === String(amt) ? ' selected' : ''}`}
                      onClick={() => setForm({ ...form, amount: String(amt) })}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="amount-input-wrap" style={{ marginTop: 10 }}>
                  <span className="currency-label">KES</span>
                  <input
                    type="number" placeholder="Or enter amount" min="1" required
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ paddingLeft: '52px' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '15px', fontSize: '1.05rem' }} disabled={loading}>
                {loading
                  ? <><span className="spinner"></span> Sending prompt...</>
                  : <><i className="fas fa-paper-plane"></i> Send M-Pesa Prompt</>}
              </button>
            </form>

            <div className="mpesa-security">
              <i className="fas fa-lock"></i>
              <span>Secure payment powered by Safaricom M-Pesa Daraja API</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Mpesa;
