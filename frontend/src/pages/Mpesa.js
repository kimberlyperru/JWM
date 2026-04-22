import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initiateMpesa, queryPaymentStatus } from '../utils/api';
import './Mpesa.css';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const POLL_INTERVAL = 5000;
const POLL_TIMEOUT  = 120000;

function Mpesa() {
  const [form, setForm]             = useState({ phone: '', amount: '' });
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState(null);
  const [payStatus, setPayStatus]   = useState(null); // null | 'waiting' | 'success' | 'timeout'
  const [checkoutId, setCheckoutId] = useState(null);
  const [elapsed, setElapsed]       = useState(0);
  const [mpesaCode, setMpesaCode]   = useState('');
  const [attempt, setAttempt]       = useState(0); // track retry attempts

  const pollRef    = useRef(null);
  const timeoutRef = useRef(null);
  const activeRef  = useRef(false);

  const stopPolling = useCallback(() => {
    activeRef.current = false;
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const startPolling = useCallback((id) => {
    activeRef.current = true;
    let secs = 0;
    pollRef.current = setInterval(async () => {
      if (!activeRef.current) return;
      secs += POLL_INTERVAL / 1000;
      setElapsed(secs);
      try {
        const res = await queryPaymentStatus(id);
        const { status } = res.data;
        if (status === 'Success') {
          stopPolling();
          setMpesaCode(res.data.mpesaCode || '');
          setPayStatus('success');
        } else if (status === 'Cancelled' || status === 'Failed') {
          stopPolling();
          setPayStatus(null);
          setMessage({ type: 'error', text: 'Payment was cancelled. Please try again.' });
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      if (activeRef.current) { stopPolling(); setPayStatus('timeout'); }
    }, POLL_TIMEOUT);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setAttempt(a => a + 1);

    try {
      const res = await initiateMpesa(form);
      const id  = res.data.checkoutRequestId;
      setCheckoutId(id);
      setElapsed(0);
      setPayStatus('waiting');
      startPolling(id);
    } catch (err) {
      const msg = err.response?.data?.message
        || err.userMessage
        || 'Could not connect to payment server. Please try again.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopPolling();
    setPayStatus(null); setCheckoutId(null);
    setForm({ phone: '', amount: '' }); setMessage(null);
    setElapsed(0); setMpesaCode(''); setAttempt(0);
  };

  // ─── SUCCESS ──────────────────────────────────────────────
  if (payStatus === 'success') {
    return (
      <div className="mpesa-page">
        <div className="page-hero">
          <h1><i className="fas fa-hand-holding-heart"></i> Give (M-Pesa)</h1>
          <p>Support the ministry through your generous giving</p>
        </div>
        <section className="section">
          <div className="mpesa-success">
            <div className="success-animation"><i className="fas fa-check-circle"></i></div>
            <h2>Payment Successful!</h2>
            <p className="success-msg">Thank you! God bless you.</p>
            {mpesaCode && (
              <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem', marginBottom: 8 }}>
                M-Pesa Code: <strong style={{ color: 'var(--success)' }}>{mpesaCode}</strong>
              </p>
            )}
            <p style={{ color: 'var(--text-mid)', fontSize: '0.93rem', marginBottom: 24 }}>
              Your giving supports the Gospel and transforms lives in Kajiado and beyond.
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

  // ─── WAITING ──────────────────────────────────────────────
  if (payStatus === 'waiting') {
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
            <h2>Check Your Phone!</h2>
            <p>
              Enter your <strong>M-Pesa PIN</strong> to complete payment of{' '}
              <strong>KES {Number(form.amount).toLocaleString()}</strong>.
            </p>
            <div className="waiting-steps">
              <div className="w-step"><span className="w-num">1</span><span>Open the M-Pesa prompt on your phone</span></div>
              <div className="w-step"><span className="w-num">2</span><span>Enter your M-Pesa PIN</span></div>
              <div className="w-step"><span className="w-num">3</span><span>This page updates automatically once confirmed</span></div>
            </div>
            <div className="polling-indicator">
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 18, height: 18 }}></span>
              Checking with Safaricom... ({Math.round(elapsed)}s)
            </div>
            <button className="btn btn-outline" onClick={reset} style={{ marginTop: 20 }}>
              Cancel &amp; Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ─── TIMEOUT ──────────────────────────────────────────────
  if (payStatus === 'timeout') {
    return (
      <div className="mpesa-page">
        <div className="page-hero">
          <h1><i className="fas fa-mobile-alt"></i> Payment Status</h1>
          <p>Did you complete the payment?</p>
        </div>
        <section className="section">
          <div className="mpesa-waiting">
            <div className="phone-animation">
              <i className="fas fa-mobile-alt"></i>
            </div>
            <h2>Did you enter your PIN?</h2>
            <p>
              If M-Pesa deducted <strong>KES {Number(form.amount).toLocaleString()}</strong> from your account,
              tap <strong>"Yes, payment done"</strong> below.
            </p>
            <div className="alert alert-info" style={{ textAlign: 'left', margin: '16px 0', fontSize: '0.88rem' }}>
              <strong>Note:</strong> In sandbox/test mode, Safaricom does not deduct real money.
              On live mode this page auto-confirms instantly.
            </div>
            <button className="btn btn-accent" onClick={() => setPayStatus('success')} style={{ width: '100%', marginBottom: 12, padding: '14px' }}>
              <i className="fas fa-check"></i>&nbsp; Yes, payment done
            </button>
            <button className="btn btn-outline" onClick={reset} style={{ width: '100%', padding: '14px' }}>
              No, try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────
  return (
    <div className="mpesa-page">
      <div className="page-hero">
        <h1><i className="fas fa-hand-holding-heart"></i> Give (M-Pesa)</h1>
        <p>Support the ministry through your generous giving</p>
      </div>

      <section className="section">
        <div className="mpesa-container">

          {/* Paybill card */}
          <div className="paybill-card">
            <h3><i className="fas fa-mobile-alt"></i> Give via Paybill</h3>
            <div className="paybill-details">
              <div className="paybill-item"><span>Paybill Number</span><strong>400200</strong></div>
              <div className="paybill-item"><span>Account Number</span><strong>32233</strong></div>
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
              Enter your Safaricom number — your phone will be prompted to enter your M-Pesa PIN.
            </p>

            {message && (
              <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
                {message.text}
                {attempt >= 2 && (
                  <p style={{ marginTop: 8, marginBottom: 0, fontSize: '0.85rem' }}>
                    <strong>Tip:</strong> The server on free hosting takes up to 60 seconds to wake up.
                    Please wait a moment and try again, or use the <strong>Paybill</strong> option above.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>M-Pesa Phone Number *</label>
                <input
                  type="tel" placeholder="e.g. 0712 345 678" required
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
                    type="number" placeholder="Or enter your own amount" min="1" required
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
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {attempt <= 1 ? ' Connecting...' : ' Retrying... (server waking up)'}
                  </>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Send M-Pesa Prompt</>
                )}
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
