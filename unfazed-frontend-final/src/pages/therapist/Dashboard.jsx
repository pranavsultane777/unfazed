import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/common/AppShell';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import StatCard from '../../components/analytics/StatCard';
import { getInitials, formatCurrency } from '../../utils/formatters';

export default function Dashboard() {
  const { therapist } = useAuth();
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      axiosInstance.get('/analytics/summary?months=1'),
      axiosInstance.get('/clients?sortBy=lastSession&order=desc'),
    ])
      .then(([analytics, clientResponse]) => {
        if (!mounted) return;
        setData(analytics.data);
        setClients(Array.isArray(clientResponse.data) ? clientResponse.data.slice(0, 5) : []);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Could not load practice dashboard data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell
      title="Practice Dashboard"
      subtitle={`Welcome back, ${therapist?.name || 'Therapist'}! Here is your practice snapshot.`}
      action={
        <Link className="btn btn-outline btn-sm" to="/dashboard/analytics">
          Detailed Analytics →
        </Link>
      }
    >
      {error && (
        <div className="error-msg" role="alert">
          {error}{' '}
          <button type="button" className="link-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {loading && <div className="loading-state" role="status">Loading dashboard insights…</div>}

      <div className="stat-grid">
        <StatCard icon="♙" value={data?.activeClients ?? '—'} label="Active Clients" tone="blue" />
        <StatCard icon="▣" value={data?.thisMonthSessions ?? '—'} label="Sessions This Month" tone="green" />
        <StatCard
          icon="₹"
          value={data ? formatCurrency(data.thisMonthEarnings || 0) : '—'}
          label="Revenue This Month"
          tone="purple"
        />
        <StatCard
          icon="◔"
          value={data ? `${data.attendanceRate || 0}%` : '—'}
          label="Session Attendance"
          tone="orange"
        />
      </div>

      <div className="dash-columns">
        {/* Upcoming Sessions */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Upcoming Scheduled Sessions</h3>
              <span>Live from your booking calendar</span>
            </div>
            <Link to="/dashboard/schedule">View Schedule</Link>
          </div>
          {(data?.upcomingSessions || []).length === 0 ? (
            <p className="muted" style={{ padding: '16px 18px' }}>No upcoming sessions scheduled.</p>
          ) : (
            data.upcomingSessions.map((s) => (
              <div className="session-row" key={s._id}>
                <time>{s.startTime}</time>
                <div className="client-avatar">
                  {getInitials(s.client?.name, 'C')}
                </div>
                <div className="session-info">
                  <b>{s.client?.name || 'Client'}</b>
                  <span>{s.date} · {s.startTime} – {s.endTime}</span>
                </div>
                {s.client?._id ? (
                  <Link className="join-btn" to={`/dashboard/clients/${s.client._id}`}>
                    Client Record
                  </Link>
                ) : (
                  <span className="tag">Booked</span>
                )}
              </div>
            ))
          )}
        </section>

        {/* Recent Clients */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Recent Clients</h3>
              <span>Live from CRM</span>
            </div>
            <Link to="/dashboard/clients">View All</Link>
          </div>
          {clients.length === 0 ? (
            <p className="muted" style={{ padding: '16px 18px' }}>No clients recorded yet.</p>
          ) : (
            clients.map((c) => (
              <Link
                key={c._id}
                to={`/dashboard/clients/${c._id}`}
                className="client-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="client-avatar">
                  {getInitials(c.name, 'C')}
                </div>
                <div>
                  <b>{c.name}</b>
                  <span>{c.email}</span>
                </div>
                <em className={c.status === 'active' ? 'status-active' : ''}>
                  {c.status}
                </em>
              </Link>
            ))
          )}
        </section>
      </div>

      <div className="quick-grid">
        <Link to="/dashboard/schedule">
          <span>＋</span>
          <b>Update Availability</b>
          <small>Open more appointment slots</small>
        </Link>
        <Link to="/dashboard/clients">
          <span>♙</span>
          <b>Manage Clients (CRM)</b>
          <small>Review clinical intake and consent</small>
        </Link>
        <Link to="/dashboard/packages">
          <span>◫</span>
          <b>Session Packages</b>
          <small>Configure multi-session passes</small>
        </Link>
      </div>
    </AppShell>
  );
}
