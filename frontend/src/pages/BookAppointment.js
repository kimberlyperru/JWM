import React, { useState } from 'react';
import { getSlots, bookAppointment } from '../utils/api';
import './BookAppointment.css';

// ✅ FIXED: Generate upcoming Wednesdays using LOCAL date (not UTC)
// Previously, toISOString() on a local Date gives UTC midnight, which
// could shift the date back by a day in EAT (UTC+3).
function getUpcomingWednesdays() {
  const wednesdays = [];
  const today = new Date();
  // Work with local year/month/day only — no timezone conversion
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Find next Wednesday (getDay() === 3)
  while (d.getDay() !== 3) d.setDate(d.getDate() + 1);

  for (let i = 0; i < 8; i++) {
    wednesdays.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setDate(d.getDate() + 7);
  }
  return wednesdays;
}

// ✅ FIXED: Format date as YYYY-MM-DD from LOCAL date parts (not UTC)
function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date) {
  return date.toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function BookAppointment() {
  const [selectedDate, setSelectedDate]   = useState('');
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [slots, setSlots]                 = useState([]);
  const [selectedSlot, setSelectedSlot]   = useState('');
  const [form, setForm]                   = useState({ name: '', phone: '', purpose: '' });
  const [loading, setLoading]             = useState(false);
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [message, setMessage]             = useState(null);
  const [step, setStep]                   = useState(1);

  const wednesdays = getUpcomingWednesdays();

  const handleDateSelect = async (dateStr, dateObj) => {
    setSelectedDate(dateStr);
    setSelectedDateObj(dateObj);
    setSelectedSlot('');
    setSlots([]);
    setSlotsLoading(true);
    setMessage(null);
    try {
      const res = await getSlots(dateStr);
      setSlots(res.data.slots);
      setStep(2);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not load slots. Please try again.'
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) {
      setMessage({ type: 'error', text: 'Please select a date and time slot.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await bookAppointment({
        ...form,
        date: selectedDate,
        timeSlot: selectedSlot
      });
      setMessage({ type: 'success', text: res.data.message });
      setStep(4);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Booking failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedDateObj(null);
    setSelectedSlot('');
    setSlots([]);
    setForm({ name: '', phone: '', purpose: '' });
    setMessage(null);
  };

  return (
    <div className="appt-page">
      <div className="page-hero">
        <h1><i className="fas fa-calendar-check"></i> Book an Appointment</h1>
        <p>Schedule a one-on-one session with Reverend Titus Ndiritu</p>
        <p style={{ marginTop: 8, fontSize: '0.9rem', opacity: 0.8 }}>
          Wednesdays only &bull; 9:00 AM – 3:00 PM &bull; 30-minute sessions
        </p>
      </div>

      <section className="section">
        <div className="appt-container">

          {/* Step indicators */}
          <div className="steps">
            {['Choose Date', 'Choose Time', 'Your Details', 'Confirmed'].map((s, i) => (
              <div
                key={i}
                className={`step-item${step > i + 1 ? ' done' : ''}${step === i + 1 ? ' active' : ''}`}
              >
                <div className="step-num">
                  {step > i + 1 ? <i className="fas fa-check"></i> : i + 1}
                </div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          {/* STEP 1 — Choose Date */}
          {step === 1 && (
            <div className="step-content">
              <h3 className="step-heading">Select a Wednesday</h3>
              <div className="date-grid">
                {wednesdays.map((wed, i) => {
                  const dateStr = formatDateLocal(wed);
                  return (
                    <button
                      key={i}
                      className={`date-btn${selectedDate === dateStr ? ' selected' : ''}`}
                      onClick={() => handleDateSelect(dateStr, wed)}
                    >
                      <span className="date-day">Wednesday</span>
                      <span className="date-full">{formatDisplay(wed)}</span>
                    </button>
                  );
                })}
              </div>
              {slotsLoading && (
                <p className="loading-text">
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 18, height: 18 }}></span>
                  &nbsp;Loading available slots...
                </p>
              )}
            </div>
          )}

          {/* STEP 2 — Choose Slot */}
          {step === 2 && (
            <div className="step-content">
              <button className="back-btn" onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <h3 className="step-heading">
                Available slots for {selectedDateObj ? formatDisplay(selectedDateObj) : selectedDate}
              </h3>
              <div className="slots-grid">
                {slots.map(({ slot, available }, i) => (
                  <button
                    key={i}
                    className={`slot-btn ${available ? 'available' : 'taken'}${selectedSlot === slot ? ' selected' : ''}`}
                    onClick={() => available && handleSlotSelect(slot)}
                    disabled={!available}
                    title={!available ? 'Sorry, this slot is already booked. Please try another time or date.' : slot}
                  >
                    <i className={`fas ${available ? 'fa-clock' : 'fa-times-circle'}`}></i>
                    <span>{slot}</span>
                    {!available && <small>Booked</small>}
                  </button>
                ))}
              </div>
              {slots.length > 0 && slots.every(s => !s.available) && (
                <div className="alert alert-error" style={{ marginTop: 20 }}>
                  Sorry, all slots for this date are fully booked. Please try another date.
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Your Details */}
          {step === 3 && (
            <div className="step-content">
              <button className="back-btn" onClick={() => setStep(2)}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <h3 className="step-heading">Your Appointment Details</h3>

              <div className="appt-summary">
                <p><i className="fas fa-calendar"></i> <strong>Date:</strong> {selectedDateObj ? formatDisplay(selectedDateObj) : selectedDate}</p>
                <p><i className="fas fa-clock"></i> <strong>Time:</strong> {selectedSlot}</p>
              </div>

              <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text" placeholder="Your full name" required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel" placeholder="+254 7XX XXX XXX" required
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Purpose of Visit <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
                  <textarea
                    rows="3"
                    placeholder="Briefly describe your reason for the appointment..."
                    value={form.purpose}
                    onChange={e => setForm({ ...form, purpose: e.target.value })}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                  disabled={loading}
                >
                  {loading
                    ? <><span className="spinner"></span> Booking...</>
                    : <><i className="fas fa-check"></i> Confirm Appointment</>}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4 — Confirmed */}
          {step === 4 && (
            <div className="step-content confirmed">
              <div className="confirmed-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h2>Appointment Confirmed!</h2>
              <p>The church has been notified. Please arrive 5 minutes before your scheduled time.</p>
              <div className="appt-summary" style={{ maxWidth: 340, margin: '20px auto 28px' }}>
                <p><i className="fas fa-user"></i> <strong>{form.name}</strong></p>
                <p><i className="fas fa-calendar"></i> {selectedDateObj ? formatDisplay(selectedDateObj) : selectedDate}</p>
                <p><i className="fas fa-clock"></i> {selectedSlot}</p>
              </div>
              <button className="btn btn-outline" onClick={resetForm}>
                Book Another Appointment
              </button>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

export default BookAppointment;
