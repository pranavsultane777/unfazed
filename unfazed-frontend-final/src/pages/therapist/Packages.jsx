import { useEffect, useState } from 'react';
import AppShell from '../../components/common/AppShell';
import axiosInstance from '../../api/axiosInstance';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({ name: '6 Session Package', numberOfSessions: 6, pricePerSession: '', validityDays: 90 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => axiosInstance.get('/therapist/packages').then((r) => setPackages(r.data)).catch((e) => setError(e.response?.data?.message || 'Could not load packages'));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      await axiosInstance.post('/payments/packages', {
        name: form.name,
        numberOfSessions: Number(form.numberOfSessions),
        pricePerSession: Number(form.pricePerSession),
        validityDays: Number(form.validityDays),
      });
      setMessage('Package created successfully.');
      setForm({ name: '6 Session Package', numberOfSessions: 6, pricePerSession: '', validityDays: 90 });
      load();
    } catch (e2) {
      setError(e2.response?.data?.message || 'Could not create package');
    }
  };

  return (
    <AppShell title="Session Packages" subtitle="Configure 3, 6 or 12-session packages for clients.">
      <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
        <h3>Create package</h3>
        <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Package name" required />
          <select value={form.numberOfSessions} onChange={(e) => setForm({ ...form, numberOfSessions: e.target.value })}>
            <option value={3}>3 sessions</option>
            <option value={6}>6 sessions</option>
            <option value={12}>12 sessions</option>
          </select>
          <input type="number" min="1" step="1" value={form.pricePerSession} onChange={(e) => setForm({ ...form, pricePerSession: e.target.value })} placeholder="Price per session (₹)" required />
          <input type="number" min="1" step="1" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} placeholder="Validity in days" required />
          <button className="btn btn-blue" type="submit">Create package</button>
        </form>
        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <h3>Active packages</h3>
        {packages.length === 0 ? <p className="muted">No packages configured.</p> : packages.map((pkg) => (
          <div key={pkg._id} style={{ borderTop: '1px solid #eee', padding: '14px 0' }}>
            <b>{pkg.name}</b>
            <div>{pkg.numberOfSessions} sessions · ₹{Number(pkg.pricePerSession).toLocaleString('en-IN')}/session · ₹{Number(pkg.totalPrice).toLocaleString('en-IN')} total · {pkg.validityDays} days</div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
