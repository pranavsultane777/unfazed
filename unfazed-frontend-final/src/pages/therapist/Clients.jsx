import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import AppShell from '../../components/common/AppShell';
import useEntitlement from '../../hooks/useEntitlement';
import ClientTable from '../../components/crm/ClientTable';


function AddClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', tags: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const { data } = await axiosInstance.post('/clients', { ...form, tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean) });
      onCreated(data); onClose();
    } catch (err) {
      if (err.response?.data?.code !== 'FEATURE_LOCKED') setError(err.response?.data?.message || 'Could not add client'); else onClose();
    } finally { setSaving(false); }
  };
  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div className="upgrade-modal" style={{ textAlign: 'left', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3>Add a new client</h3>
        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <input className="inner-search" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="inner-search" placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="inner-search" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="inner-search" placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          {error && <span style={{ color: '#c0392b' }}>{error}</span>}
          <div className="upgrade-modal-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-blue" disabled={saving}>{saving ? 'Saving…' : 'Add Client'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { capFor } = useEntitlement();
  const cap = capFor('activeClients');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axiosInstance.get('/clients', { params: { search, status, tag, sortBy, order } });
      setClients(data);
    } catch (err) { setError(err.response?.data?.message || 'Could not load clients'); }
    finally { setLoading(false); }
  }, [search, status, tag, sortBy, order]);

  useEffect(() => { load(); }, [load]);
  const tags = [...new Set(clients.flatMap((c) => c.tags || []))];

  return (
    <AppShell title="Clients" subtitle={cap ? `Manage your client relationships and records. (${clients.filter((c) => c.status === 'active').length}/${cap} active clients)` : 'Manage your client relationships and records.'} action={<button className="btn btn-blue" onClick={() => setShowAdd(true)}>＋ Add Client</button>}>
      <div className="toolbar-row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <input className="inner-search" placeholder="⌕ Search name, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-btn" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select className="filter-btn" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">All tags</option>{tags.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="filter-btn" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name">Name</option><option value="lastSession">Last session</option><option value="status">Status</option></select>
        <button className="filter-btn" onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}>{order === 'asc' ? '↑' : '↓'}</button>
      </div>
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}
      <section className="panel table-panel">
        {loading ? <p>Loading clients...</p> : clients.length === 0 ? <p>No clients match your filters.</p> : (
          <ClientTable clients={clients} renderActions={(c) => <Link to={`/dashboard/clients/${c._id}`}>View →</Link>} />
        )}
      </section>
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onCreated={() => load()} />}
    </AppShell>
  );
}
