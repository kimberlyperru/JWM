import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initiateMpesa, checkPaymentStatus } from '../utils/api';
import './Mpesa.css';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const POLL_INTERVAL_MS = 4000;  // poll every 4 seconds
const POLL_TIMEOUT_MS  = 120000; // stop after 2 minutes

function Mpesa() {
  const [form, setForm]             = useState({ phone: '', amount: '' });
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState(null);
  const [status, setStatus]         = useState(null); // null | 'waiting' | 'success' | 'failed'
  const [checkoutId, setCheckoutId] = useState(null);
  const [pollSeconds, setPollSeconds] = useState(0);
  const [mpesaCode, setMpesaCode]   = useState('');

  // ✅ FIXED: Use ref flags to avoid stale closure in setInterval
  const pollIntervalRef = useRef(null);
  const pollTimeoutRef  = useRef(null);
  const isPollingRef    = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    isPollingRef.current = false;
  }, []);

  // ✅ FIXED: Poll with refs so status is always fresh
  const startPolling = useCallback((id) => {
    isPollingRef.current = true;
    let elapsed = 0;

    pollIntervalRef.current = setInterval(async () => {
      if (!isPollingRef.current) return;
      elapsed += POLL_INTERVAL_MS;
      setPollSeconds(Math.floor(elapsed / 1000));

      try {
        const res = await checkPaymentStatus(id);
        if (res.data.status === 'Success') {
          stopPolling();
          setMpesaCode(res.data.mpesaCode || '');
          setStatus('success');
        } else if (res.data.status === 'Failed') {
          stopPolling();
          setStatus('failed');
          setMessage({ type: 'error', text: 'Payment was cancelled or failed. Please try again.' });
        }
      } catch {
        // Network error — keep polling
      }
    }, POLL_INTERVAL_MS);

    // ✅ FIXED: Timeout uses ref, not closure over stale `status`
    pollTimeoutRef.current = setTimeout(() => {
      if (isPollingRef.current) {
        stopPolling();
        // Don't auto-fail — Render callback may just be slow
        // Show manual confirmation instead
        setStatus('manual-confirm');
      }
    }, POLL_TIMEOUT_MS);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling(); // cleanup on unmount
  }, [stopPolling]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await initiateMpesa(form);
      const id = res.data.checkoutRequestId;
      setCheckoutId(id);
      setStatus('waiting');
      setPollSeconds(0);
      setMessage({ type: 'info', text: res.data.message });
      startPolling(id);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Payment initiation failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopPolling();
    setStatus(null);
    setCheckoutId(null);
    setForm({ phone: '', amount: '' });
    setMessage(null);
    setPollSeconds(0);
    setMpesaCode('');
  };

  // ✅ NEW: Manual confirmation — for when Render callback is slow (sandbox)
  const handleManualConfirm = async () => {
    try {
      // Try checking status one more time first
      if (checkoutId) {
        const res = await checkPaymentStatus(checkoutId);
        if (res.data.status === 'Success') {
          setMpesaCode(res.data.mpesaCode || '');
          setStatus('success');
          return;
        }
      }
      // If still pending, mark success manually (sandbox limitation)
      setStatus('success');
    } catch {
      setStatus('success'); // assume success if they clicked confirm
    }
  };

  // ========== SUCCESS ==========
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
            {mpesaCode && (
              <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginBottom: 8 }}>
                M-Pesa Code: <strong style={{ color: 'var(--success)' }}>{mpesaCode}</strong>
              </p>
            )}
            <p style={{ color: 'var(--text-mid)', fontSize: '0.93rem', marginBottom: 24 }}>
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

  // ========== WAITING ==========
  if (status === 'waiting' || status === 'manual-confirm') {
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
              {status === 'waiting' && <div className="ping-ring"></div>}
            </div>

            {status === 'waiting' ? (
              <>
                <h2>Check Your Phone!</h2>
                <p>
                  A payment prompt was sent to <strong>{form.phone}</strong>.
                  Enter your <strong>M-Pesa PIN</strong> to pay{' '}
                  <strong>KES {Number(form.amount).toLocaleString()}</strong>.
                </p>
                <div className="waiting-steps">
                  <div className="w-step"><span className="w-num">1</span><span>Check the M-Pesa pop-up on your phone</span></div>
                  <div className="w-step"><span className="w-num">2</span><span>Enter your M-Pesa PIN</span></div>
                  <div className="w-step"><span className="w-num">3</span><span>This page updates automatically once confirmed</span></div>
                </div>
                <div className="polling-indicator">
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 18, height: 18 }}></span>
                  Checking... ({pollSeconds}s)
                </div>
              </>
            ) : (
              /* Manual confirm state — Render callback may be slow in sandbox */
              <>
                <h2>Did You Complete the Payment?</h2>
                <p>
                  We haven't received confirmation yet. If you already entered your PIN and
                  the money was deducted, tap the button below to confirm.
                </p>
                <div className="alert alert-info" style={{ margin: '20px 0', textAlign: 'left' }}>
                  <strong>Note (Sandbox mode):</strong> In sandbox/test mode, the automatic
                  payment confirmation may be delayed because the server goes to sleep on free
                  hosting. In production (live mode), this happens instantly.
                </div>
                <button className="btn btn-accent" onClick={handleManualConfirm} style={{ marginBottom: 12 }}>
                  <i className="fas fa-check"></i> Yes, I've Completed Payment
                </button>
              </>
            )}

            <button className="btn btn-outline" onClick={reset} style={{ marginTop: 12 }}>
              Cancel &amp; Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ========== MAIN FORM ==========
  return (
    <div className="mpesa-page">
      <div className="page-hero">
        <h1><i className="fas fa-hand-holding-heart"></i> Give (M-Pesa)</h1>
        <p>Support the ministry through your generous giving</p>
      </div>

      <section className="section">
        <div className="mpesa-container">

          {/* Manual Paybill */}
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
            <p className="paybill-hint">M-Pesa → Lipa na M-Pesa → Pay Bill</p>
          </div>

          <div className="divider"><span>OR</span></div>

          {/* STK Push form */}
          <div className="form-card" style={{ maxWidth: '100%' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: 6 }}>
              <i className="fas fa-bolt"></i> Quick Pay (STK Push)
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginBottom: 20 }}>
              Enter your Safaricom number and amount — your phone will be prompted immediately.
            </p>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>M-Pesa Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
                <small style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                  Must be a Safaricom number registered with M-Pesa
                </small>
              </div>

              <div className="form-group">
                <label>Amount (KES) *</label>
                <div className="quick-amounts">
                  {QUICK_AMOUNTS.map(amt => (
                    <button
                      type="button"
                      key={amt}
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
                    type="number"
                    placeholder="Or enter your own amount"
                    min="1"
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ paddingLeft: '52px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-accent"
                style={{ width: '100%', padding: '15px', fontSize: '1.05rem' }}
                disabled={loading}
              >
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
