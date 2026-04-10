import React, { useState } from 'react';
import { submitPledge } from '../utils/api';
import './Pledge.css';

const PLEDGE_CATEGORIES = [
  'Building Fund', 'Tithes', 'Missions', 'Children Ministry',
  'Worship Equipment', 'Community Outreach', 'General Offering', 'Other'
];

function Pledge() {
  const [form, setForm] = useState({
    name: '', phone: '', amount: '', paymentDate: '', pledgeFor: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [done, setDone] = useState(false);
  const [pledgeData, setPledgeData] = useState(null);

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await submitPledge(form);
      setMessage({ type: 'success', text: res.data.message });
      setPledgeData({ ...form });
      setDone(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Min date = today
  const today = new Date().toISOString().split('T')[0];

  if (done && pledgeData) {
    return (
      <div className="pledge-page">
        <div className="page-hero">
          <h1><i className="fas fa-hand-holding-heart"></i> Pledge</h1>
          <p>Thank you for your generous commitment</p>
        </div>
        <section className="section">
          <div className="pledge-done">
            <div className="done-icon"><i className="fas fa-check-circle"></i></div>
            <h2>Pledge Received!</h2>
            <p style={{ color: 'var(--text-mid)', marginBottom: 20 }}>{message?.text}</p>
            <div className="pledge-receipt">
              <h4>Pledge Summary</h4>
              <div className="receipt-row"><span>Name</span><strong>{pledgeData.name}</strong></div>
              <div className="receipt-row"><span>Phone</span><strong>{pledgeData.phone}</strong></div>
              <div className="receipt-row"><span>Amount</span><strong>KES {Number(pledgeData.amount).toLocaleString()}</strong></div>
              <div className="receipt-row"><span>Payment Date</span><strong>{pledgeData.paymentDate}</strong></div>
              <div className="receipt-row"><span>Pledge For</span><strong>{pledgeData.pledgeFor}</strong></div>
            </div>
            <p className="scripture-verse">
              "Each of you should give what you have decided in your heart to give, not reluctantly
              or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7
            </p>
            <button className="btn btn-outline" onClick={() => { setDone(false); setForm({ name:'',phone:'',amount:'',paymentDate:'',pledgeFor:'' }); }}>
              Make Another Pledge
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pledge-page">
      <div className="page-hero">
        <h1><i className="fas fa-hand-holding-heart"></i> Make a Pledge</h1>
        <p>Commit to a future gift and support the growth of the ministry</p>
      </div>

      <section className="section">
        <div className="form-card" style={{ maxWidth: 600 }}>
          <div className="pledge-banner">
            <i className="fas fa-bible"></i>
            <p>"Honor the Lord with your wealth, with the firstfruits of all your crops." — Proverbs 3:9</p>
          </div>

          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Your full name" required
                value={form.name} onChange={e => update('name', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" placeholder="+254 7XX XXX XXX" required
                value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Pledge Amount (KES) *</label>
              <div className="amount-input-wrap">
                <span className="currency-label">KES</span>
                <input
                  type="number" placeholder="0.00" min="1" required
                  value={form.amount} onChange={e => update('amount', e.target.value)}
                  style={{ paddingLeft: '52px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Date to Pay *</label>
              <input type="date" required min={today}
                value={form.paymentDate} onChange={e => update('paymentDate', e.target.value)} />
            </div>

            <div className="form-group">
              <label>This Pledge is For *</label>
              <select required value={form.pledgeFor} onChange={e => update('pledgeFor', e.target.value)}>
                <option value="">Select category</option>
                {PLEDGE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} disabled={loading}>
              {loading
                ? <><span className="spinner"></span> Submitting...</>
                : <><i className="fas fa-paper-plane"></i> Submit Pledge</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Pledge;
