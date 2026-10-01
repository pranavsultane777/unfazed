import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/common/AppShell';
import axiosInstance from '../../api/axiosInstance';

export default function NotesIndex() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    axiosInstance.get('/clients', { params: { sortBy: 'name', order: 'asc' } })
      .then((response) => mounted && setClients(Array.isArray(response.data) ? response.data : []))
      .catch((err) => mounted && setError(err.response?.data?.message || 'Could not load clients.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <AppShell title="Clinical Notes" subtitle="Choose a client to open their private and shared clinical notes workspace.">
      {loading && <div className="loading-state" role="status">Loading clients…</div>}
      {error && <div className="error-msg" role="alert">{error}</div>}
      {!loading && !error && clients.length === 0 && <div className="empty-state">No clients are available for notes yet. <Link to="/dashboard/clients">Add a client</Link></div>}
      <div className="feature-grid">
        {clients.map((client) => (
          <section className="panel" key={client._id} style={{ padding: 20 }}>
            <div className="client-avatar" aria-hidden="true">{(client.name || '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
            <h3>{client.name}</h3>
            <p className="muted">{client.email || 'No email'}</p>
            <Link className="btn btn-blue" to={`/dashboard/clients/${client._id}/notes`}>Open notes</Link>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
