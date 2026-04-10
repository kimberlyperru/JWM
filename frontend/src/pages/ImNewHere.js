import React, { useState } from 'react';
import { registerMember } from '../utils/api';
import './ImNewHere.css';

function ImNewHere() {
  const [form, setForm] = useState({
    name: '', phone: '', gender: '', age: '',
    maritalStatus: '', spouseName: '', kids: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [done, setDone] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addKid = () => {
    setForm(prev => ({ ...prev, kids: [...prev.kids, { name: '', age: '' }] }));
  };

  const updateKid = (index, field, value) => {
    const kids = [...form.kids];
    kids[index][field] = value;
    setForm(prev => ({ ...prev, kids }));
  };

  const removeKid = (index) => {
    setForm(prev => ({ ...prev, kids: prev.kids.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await registerMember(form);
      setMessage({ type: 'success', text: res.data.message });
      setDone(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="newhere-page">
        <div className="page-hero">
          <h1><i className="fas fa-hands-praying"></i> Welcome!</h1>
          <p>We are so glad you are here</p>
        </div>
        <section className="section">
          <div className="newhere-done">
            <div className="done-icon"><i className="fas fa-church"></i></div>
            <h2>Welcome to JWM Kajiado!</h2>
            <p>{message?.text}</p>
            <p style={{ marginTop: 12, color: 'var(--text-mid)', fontSize: '0.95rem' }}>
              Our team will be in touch with you soon. We look forward to seeing you at our services!
            </p>
            <div className="done-info">
              <p><i className="fas fa-map-marker-alt"></i> Showground, Kajiado</p>
              <p><i className="fas fa-clock"></i> Sundays: 6:00 AM & 1:00 PM</p>
              <p><i className="fas fa-phone"></i> +254 720 178193</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setDone(false); setForm({ name:'',phone:'',gender:'',age:'',maritalStatus:'',spouseName:'',kids:[] }); }}>
              Register Another Person
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="newhere-page">
      <div className="page-hero">
        <h1><i className="fas fa-door-open"></i> I'm New Here</h1>
        <p>Welcome! We'd love to know more about you. Fill in the form below to get connected.</p>
      </div>

      <section className="section">
        <div className="form-card" style={{ maxWidth: 680 }}>
          <div className="welcome-banner">
            <i className="fas fa-heart"></i>
            <div>
              <h3>You are welcome here!</h3>
              <p>This information helps our pastoral team follow up and connect with you personally.</p>
            </div>
          </div>

          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          <form onSubmit={handleSubmit}>
            <h4 className="form-section-title">Personal Information</h4>

            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Your full name" required
                value={form.name} onChange={e => update('name', e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input type="tel" placeholder="+254 7XX XXX XXX" required
                  value={form.phone} onChange={e => update('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Age *</label>
                <input type="number" placeholder="Your age" min="1" max="120" required
                  value={form.age} onChange={e => update('age', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender *</label>
                <select required value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Marital Status *</label>
                <select required value={form.maritalStatus} onChange={e => update('maritalStatus', e.target.value)}>
                  <option value="">Select status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
            </div>

            {form.maritalStatus === 'Married' && (
              <div className="form-group">
                <label>Spouse's Name</label>
                <input type="text" placeholder="Your spouse's full name"
                  value={form.spouseName} onChange={e => update('spouseName', e.target.value)} />
              </div>
            )}

            <h4 className="form-section-title" style={{ marginTop: 28 }}>
              Children <span style={{ fontWeight: 400, color: 'var(--text-mid)', fontSize: '0.85rem' }}>(optional)</span>
            </h4>

            {form.kids.map((kid, i) => (
              <div key={i} className="kid-row">
                <div className="form-row" style={{ flex: 1 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Child's Name</label>
                    <input type="text" placeholder="Name" value={kid.name}
                      onChange={e => updateKid(i, 'name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Age</label>
                    <input type="number" placeholder="Age" min="0" max="30" value={kid.age}
                      onChange={e => updateKid(i, 'age', e.target.value)} />
                  </div>
                </div>
                <button type="button" className="remove-kid-btn" onClick={() => removeKid(i)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}

            <button type="button" className="btn btn-outline add-kid-btn" onClick={addKid}>
              <i className="fas fa-plus"></i> Add Child
            </button>

            <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
              {loading ? <><span className="spinner"></span> Submitting...</> : <><i className="fas fa-paper-plane"></i> Register</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default ImNewHere;
