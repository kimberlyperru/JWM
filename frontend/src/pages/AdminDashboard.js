import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminAppointments, getAdminMembers, getAdminPledges,
  getAdminPayments, getAdminSummary, deleteAdminRecord, downloadPDF
} from '../utils/api';
import './AdminDashboard.css';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'fa-chart-bar' },
  { key: 'appointments', label: 'Appointments', icon: 'fa-calendar-check' },
  { key: 'members', label: 'New Members', icon: 'fa-users' },
  { key: 'pledges', label: 'Pledges', icon: 'fa-hand-holding-heart' },
  { key: 'payments', label: 'M-Pesa Payments', icon: 'fa-mobile-alt' },
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({ appointments: [], members: [], pledges: [], payments: [] });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, members, pledges, payments, summ] = await Promise.all([
        getAdminAppointments(), getAdminMembers(), getAdminPledges(),
        getAdminPayments(), getAdminSummary()
      ]);
      setData({
        appointments: appts.data.data,
        members: members.data.data,
        pledges: pledges.data.data,
        payments: payments.data.data,
      });
      setSummary(summ.data.summary);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('jwm_admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (type, id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    await deleteAdminRecord(type, id);
    fetchAll();
  };

  const handleDownloadPDF = async (type) => {
    setPdfLoading(type);
    try {
      const res = await downloadPDF(type);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${type}_report.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF download failed. Please try again.');
    } finally {
      setPdfLoading('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwm_admin_token');
    navigate('/admin');
  };

  const filterData = (items) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(item =>
      Object.values(item).some(v => String(v).toLowerCase().includes(q))
    );
  };

  const fmt = (num) => Number(num || 0).toLocaleString();
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-KE') : '-';

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <img src="/image/favicon.jpg" alt="JWM" />
          <div>
            <h4>JWM Admin</h4>
            <span>Kajiado Branch</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`sidebar-btn${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-btn logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h2>{TABS.find(t => t.key === activeTab)?.label}</h2>
          <div className="topbar-right">
            {activeTab !== 'overview' && activeTab !== 'payments' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleDownloadPDF(activeTab)}
                disabled={!!pdfLoading}
              >
                {pdfLoading === activeTab
                  ? <><span className="spinner"></span> Generating...</>
                  : <><i className="fas fa-file-pdf"></i> Download PDF</>}
              </button>
            )}
            <input
              type="search"
              placeholder="Search records..."
              className="admin-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 4, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }}></span>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && summary && (
              <div className="overview">
                <div className="summary-grid">
                  <div className="summary-card blue">
                    <i className="fas fa-calendar-check"></i>
                    <div><span>Appointments</span><strong>{summary.totalAppointments}</strong></div>
                  </div>
                  <div className="summary-card green">
                    <i className="fas fa-users"></i>
                    <div><span>New Members</span><strong>{summary.totalMembers}</strong></div>
                  </div>
                  <div className="summary-card gold">
                    <i className="fas fa-hand-holding-heart"></i>
                    <div><span>Pledges</span><strong>{summary.totalPledges}</strong></div>
                  </div>
                  <div className="summary-card purple">
                    <i className="fas fa-coins"></i>
                    <div><span>Total Pledged</span><strong>KES {fmt(summary.totalPledgeAmount)}</strong></div>
                  </div>
                  <div className="summary-card teal">
                    <i className="fas fa-mobile-alt"></i>
                    <div><span>M-Pesa Payments</span><strong>{summary.totalPayments}</strong></div>
                  </div>
                  <div className="summary-card dark">
                    <i className="fas fa-wallet"></i>
                    <div><span>Total Collected</span><strong>KES {fmt(summary.totalCollected)}</strong></div>
                  </div>
                </div>

                <div className="overview-quick">
                  <h3>Quick Actions</h3>
                  <div className="quick-actions">
                    {['appointments', 'members', 'pledges'].map(type => (
                      <button key={type} className="quick-action-btn"
                        onClick={() => handleDownloadPDF(type)}
                        disabled={!!pdfLoading}
                      >
                        <i className="fas fa-file-pdf"></i>
                        Download {type.charAt(0).toUpperCase() + type.slice(1)} PDF
                      </button>
                    ))}
                  </div>
                </div>

                <div className="recent-section">
                  <h3>Recent Appointments</h3>
                  <SimpleTable
                    rows={data.appointments.slice(-5).reverse()}
                    cols={['name','phone','date','timeSlot','purpose']}
                    labels={['Name','Phone','Date','Time','Purpose']}
                  />
                </div>
              </div>
            )}

            {/* APPOINTMENTS */}
            {activeTab === 'appointments' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Phone</th>
                      <th>Date</th><th>Time Slot</th><th>Purpose</th>
                      <th>Booked On</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(data.appointments).length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--text-light)' }}>No appointments found</td></tr>
                    ) : filterData(data.appointments).map((a, i) => (
                      <tr key={a.id}>
                        <td>{i + 1}</td>
                        <td><strong>{a.name}</strong></td>
                        <td>{a.phone}</td>
                        <td>{a.date}</td>
                        <td><span className="badge badge-success">{a.timeSlot}</span></td>
                        <td>{a.purpose || '-'}</td>
                        <td>{fmtDate(a.createdAt)}</td>
                        <td>
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete('appointments', a.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MEMBERS */}
            {activeTab === 'members' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Phone</th><th>Gender</th>
                      <th>Age</th><th>Status</th><th>Spouse</th><th>Kids</th>
                      <th>Registered</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(data.members).length === 0 ? (
                      <tr><td colSpan="10" style={{ textAlign: 'center', padding: 30, color: 'var(--text-light)' }}>No members found</td></tr>
                    ) : filterData(data.members).map((m, i) => (
                      <tr key={m.id}>
                        <td>{i + 1}</td>
                        <td><strong>{m.name}</strong></td>
                        <td>{m.phone}</td>
                        <td>{m.gender}</td>
                        <td>{m.age}</td>
                        <td><span className="badge badge-pending">{m.maritalStatus}</span></td>
                        <td>{m.spouseName || '-'}</td>
                        <td>{m.kids?.length > 0 ? m.kids.map(k => `${k.name}(${k.age})`).join(', ') : '-'}</td>
                        <td>{fmtDate(m.createdAt)}</td>
                        <td>
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete('members', m.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PLEDGES */}
            {activeTab === 'pledges' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Phone</th>
                      <th>Amount</th><th>Payment Date</th><th>Pledge For</th>
                      <th>Submitted</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(data.pledges).length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30, color: 'var(--text-light)' }}>No pledges found</td></tr>
                    ) : filterData(data.pledges).map((p, i) => (
                      <tr key={p.id}>
                        <td>{i + 1}</td>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.phone}</td>
                        <td><strong style={{ color: 'var(--success)' }}>KES {Number(p.amount).toLocaleString()}</strong></td>
                        <td>{p.paymentDate}</td>
                        <td>{p.pledgeFor}</td>
                        <td>{fmtDate(p.createdAt)}</td>
                        <td>
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete('pledges', p.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAYMENTS */}
            {activeTab === 'payments' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Phone</th><th>Amount</th>
                      <th>M-Pesa Code</th><th>Status</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(data.payments).length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--text-light)' }}>No payments found</td></tr>
                    ) : filterData(data.payments).map((p, i) => (
                      <tr key={p.id}>
                        <td>{i + 1}</td>
                        <td>{p.phone}</td>
                        <td><strong style={{ color: 'var(--success)' }}>KES {Number(p.amount || 0).toLocaleString()}</strong></td>
                        <td>{p.mpesaCode || '-'}</td>
                        <td>
                          <span className={`badge ${p.status === 'Success' ? 'badge-success' : 'badge-pending'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>{fmtDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SimpleTable({ rows, cols, labels }) {
  if (!rows || rows.length === 0) return <p style={{ color: 'var(--text-light)', padding: '10px 0' }}>No recent records.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{labels.map((l, i) => <th key={i}>{l}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c, j) => <td key={j}>{r[c] || '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;
