import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import AppShell from '../../components/common/AppShell';
import useEntitlement from '../../hooks/useEntitlement';
import StatCard from '../../components/analytics/StatCard';
import RevenueChart from '../../components/analytics/RevenueChart';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { tier, capFor } = useEntitlement();

  const load = useCallback(async (selectedMonths = months) => {
    setLoading(true); setError('');
    try {
      const response = await axiosInstance.get(`/analytics/summary?months=${selectedMonths}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { load(months); }, [load, months]);

  const chart = (data?.monthlyEarnings || []).map((item) => ({
    month: item.month,
    revenue: Number(item.total || 0),
  }));

  const analyticsCap = Number(capFor('analyticsMonths') || 1);

  return (
    <AppShell
      title="Analytics"
      subtitle="Revenue, clients and attendance calculated from your MongoDB data."
      action={(
        <select className="date-btn" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {[...new Set([1, 3, 6, 12, 24, analyticsCap])].filter((n) => n <= analyticsCap).sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} month{n > 1 ? 's' : ''}</option>)}
        </select>
      )}
    >
      <div style={{ marginBottom: 16, color: '#555' }}>
        Current plan: <b>{tier?.tier?.name || 'Loading...'}</b> · analytics history cap: <b>{analyticsCap} month{analyticsCap > 1 ? 's' : ''}</b>
      </div>

      {loading && <p>Loading real analytics...</p>}
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard icon="₹" value={`₹${Number(data.thisMonthEarnings || 0).toLocaleString('en-IN')}`} label="Revenue This Month" tone="purple" />
            <StatCard icon="▣" value={data.thisMonthSessions || 0} label="Sessions This Month" tone="blue" />
            <StatCard icon="♙" value={data.activeClients || 0} label="Active Clients" tone="green" />
            <StatCard icon="◔" value={`${data.attendanceRate || 0}%`} label="Attendance Rate" tone="orange" />
          </div>

          <div className="stat-grid" style={{ marginTop: 16 }}>
            <StatCard icon="↗" value={`₹${Number(data.totalEarnings || 0).toLocaleString('en-IN')}`} label="Net Revenue All Time" tone="purple" />
            <StatCard icon="✓" value={data.completedSessions || 0} label="Completed Sessions" tone="green" />
            <StatCard icon="!" value={`${data.noShowRate || 0}%`} label="No-show Rate" tone="orange" />
            <StatCard icon="♙" value={data.totalClients || 0} label="Total Clients" tone="blue" />
          </div>

          <section className="panel analytics-panel" style={{ marginTop: 20 }}>
            <div className="panel-head">
              <div><h3>Revenue Trend</h3><span>Server-side MongoDB aggregation · {data.analyticsMonths} month range</span></div>
            </div>
            <div className="chart-wrap">
<RevenueChart data={chart} />
            </div>
          </section>

          <section className="panel" style={{ marginTop: 20, padding: 20 }}>
            <h3>Session Outcomes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {(data.statusBreakdown || []).map((row) => (
                <div key={row._id} style={{ padding: 12, background: '#f7f8fa', borderRadius: 10 }}>
                  <b style={{ textTransform: 'capitalize' }}>{row._id}</b>
                  <div style={{ fontSize: 22, marginTop: 5 }}>{row.count}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
