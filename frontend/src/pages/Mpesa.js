import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initiateMpesa, queryPaymentStatus } from '../utils/api';
import './Mpesa.css';

const QUICK_AMOUNTS   = [100, 200, 500, 1000, 2000, 5000];
const POLL_INTERVAL   = 5000;  // ask Daraja every 5 seconds
const POLL_TIMEOUT    = 120000; // give up after 2 minutes

function Mpesa() {
  const [form, setForm]             = useState({ phone: '', amount: '' });
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState(null);
  const [payStatus, setPayStatus]   = useState(null); // null|'waiting'|'success'|'cancelled'|'timeout'
  const [checkoutId, setCheckoutId] = useState(null);
  const [elapsed, setElapsed]       = useState(0);
  const [mpesaCode, setMpesaCode]   = useState('');

  const pollRef    = useRef(null);
  const timeoutRef = useRef(null);
  const activeRef  = useRef(false); // prevents stale closure

  const stopPolling = useCallback(() => {
    activeRef.current = false;
    if (pollRef.current)    clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const startPolling = useCallback((id) => {
    activeRef.current = true;
    let secs = 0;

    pollRef.current = setInterval(async () => {
      if (!activeRef.current) return;
      secs += POLL_INTERVAL / 1000;
      setElapsed(secs);

      try {
        // ✅ FIXED: /query hits Daraja directly — no callback needed
        const res = await queryPaymentStatus(id);
        const { status } = res.data;

        if (status === 'Success') {
          stopPolling();
          setMpesaCode(res.data.mpesaCode || '');
          setPayStatus('success');
        } else if (status === 'Cancelled' || status === 'Failed') {
          stopPolling();
          setPayStatus('cancelled');
          setMessage({ type: 'error', text: 'Payment was cancelled or failed. Please try again.' });
        }
        // 'Pending' → keep polling
      } catch {
        // network hiccup — keep polling
      }
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      if (activeRef.current) {
        stopPolling();
        setPayStatus('timeout');
      }
    }, POLL_TIMEOUT);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await initiateMpesa(form);
      const id  = res.data.checkoutRequestId;
      setCheckoutId(id);
      setElapsed(0);
      setPayStatus('waiting');
      startPolling(id);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.userMessage || 'Payment failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopPolling();
    setPayStatus(null); setCheckoutId(null);
    setForm({ phone: '', amount: '' }); setMessage(null);
    setElapsed(0); setMpesaCode('');
  };

  // ─── SUCCESS ───────────────────────────────────────────────
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
              <p style={{ color:'var(--text-mid)', fontSize:'0.9rem', marginBottom:8 }}>
                M-Pesa Code: <strong style={{ color:'var(--success)' }}>{mpesaCode}</strong>
              </p>
            )}
            <p style={{ color:'var(--text-mid)', fontSize:'0.93rem', marginBottom:24 }}>
              Your giving supports the Gospel and transforms lives in Kajiado and beyond.
            </p>
            <p className="scripture-verse">
              "Give, and it will be given to you. A good measure, pressed down, shaken together
              and running over, will be poured into your lap." — Luke 6:38
            </p>
            <button className="btn btn-primary" onClick={reset} style={{ marginTop:20 }}>
              Make Another Payment
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ─── WAITING / TIMEOUT ─────────────────────────────────────
  if (payStatus === 'waiting' || payStatus === 'timeout') {
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
              {payStatus === 'waiting' && <div className="ping-ring"></div>}
            </div>

            {payStatus === 'waiting' ? (
              <>
                <h2>Check Your Phone!</h2>
                <p>
                  Enter your <strong>M-Pesa PIN</strong> to pay{' '}
                  <strong>KES {Number(form.amount).toLocaleString()}</strong> from <strong>{form.phone}</strong>.
                </p>
                <div className="waiting-steps">
                  <div className="w-step"><span className="w-num">1</span><span>Open the M-Pesa prompt on your phone</span></div>
                  <div className="w-step"><span className="w-num">2</span><span>Enter your M-Pesa PIN</span></div>
                  <div className="w-step"><span className="w-num">3</span><span>This page updates automatically</span></div>
                </div>
                <div className="polling-indicator">
                  <span className="spinner" style={{ borderTopColor:'var(--primary)', borderColor:'var(--border)', width:18, height:18 }}></span>
                  Checking Safaricom... ({Math.round(elapsed)}s)
                </div>
              </>
            ) : (
              /* Timeout — 2 minutes passed */
              <>
                <h2>Taking longer than expected…</h2>
                <p>If you already entered your PIN and the money was deducted, your payment was received.</p>
                <div className="alert alert-info" style={{ textAlign:'left', margin:'16px 0' }}>
                  <strong>Sandbox note:</strong> In test mode, Safaricom does not deduct real money.
                  On live mode, confirmation is instant. Click below if you completed payment.
                </div>
                <button className="btn btn-accent" style={{ marginBottom:12 }}
                  onClick={() => setPayStatus('success')}>
                  <i className="fas fa-check"></i>&nbsp;Yes, I Completed the Payment
                </button>
              </>
            )}

            <button className="btn btn-outline" onClick={reset} style={{ marginTop:12 }}>
              Cancel &amp; Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ─── MAIN FORM ─────────────────────────────────────────────
  return (
    <div className="mpesa-page">
      <div className="page-hero">
        <h1><i className="fas fa-hand-holding-heart"></i> Give (M-Pesa)</h1>
        <p>Support the ministry through your generous giving</p>
      </div>

      <section className="section">
        <div className="mpesa-container">

          <div className="paybill-card">
            <h3><i className="fas fa-mobile-alt"></i> Give via Paybill</h3>
            <div className="paybill-details">
              <div className="paybill-item"><span>Paybill Number</span><strong>400200</strong></div>
              <div className="paybill-item"><span>Account Number</span><strong>32233</strong></div>
            </div>
            <p className="paybill-hint">M-Pesa → Lipa na M-Pesa → Pay Bill</p>
          </div>

          <div className="divider"><span>OR</span></div>

          <div className="form-card" style={{ maxWidth:'100%' }}>
            <h3 style={{ color:'var(--primary)', marginBottom:6 }}>
              <i className="fas fa-bolt"></i> Quick Pay (STK Push)
            </h3>
            <p style={{ color:'var(--text-mid)', fontSize:'0.9rem', marginBottom:20 }}>
              Enter your Safaricom number — your phone will be prompted immediately.
            </p>

            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>M-Pesa Phone Number *</label>
                <input type="tel" placeholder="e.g. 0712 345 678" required
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <small style={{ color:'var(--text-light)', fontSize:'0.78rem', marginTop:4, display:'block' }}>
                  Must be a Safaricom number registered with M-Pesa
                </small>
              </div>

              <div className="form-group">
                <label>Amount (KES) *</label>
                <div className="quick-amounts">
                  {QUICK_AMOUNTS.map(amt => (
                    <button type="button" key={amt}
                      className={`quick-amount-btn${form.amount === String(amt) ? ' selected' : ''}`}
                      onClick={() => setForm({ ...form, amount: String(amt) })}>
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="amount-input-wrap" style={{ marginTop:10 }}>
                  <span className="currency-label">KES</span>
                  <input type="number" placeholder="Or enter your own amount" min="1" required
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ paddingLeft:'52px' }} />
                </div>
              </div>

              <button type="submit" className="btn btn-accent"
                style={{ width:'100%', padding:'15px', fontSize:'1.05rem' }} disabled={loading}>
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
