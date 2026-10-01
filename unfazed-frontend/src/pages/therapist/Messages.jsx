import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/common/AppShell';
import ChatWindow from '../../components/chat/ChatWindow';

const initials = (name = '') => name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

export default function Messages() {
  const { therapist } = useAuth();
  const [clients, setClients] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    axiosInstance.get('/clients', { params: { status: 'active', sortBy: 'name', order: 'asc' } })
      .then((r) => {
        if (!mounted) return;
        const list = Array.isArray(r.data) ? r.data : [];
        setClients(list);
        setActive(list[0] || null);
      })
      .catch((err) => mounted && setError(err.response?.data?.message || 'Could not load clients'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const roomId = useMemo(() => (
    therapist && active ? [String(therapist._id), String(active._id)].sort().join('-') : null
  ), [therapist, active]);

  return (
    <AppShell title="Messages" subtitle="Secure real-time conversations with your clients.">
      <div className="messages-layout panel">
        <aside className="conv-list">
          <div className="panel-head">
            <div><h3>Client conversations</h3><span>{clients.length} active client{clients.length === 1 ? '' : 's'}</span></div>
          </div>
          {loading && <p className="muted" style={{ padding: 18 }}>Loading clients...</p>}
          {error && <p style={{ color: '#c0392b', padding: 18 }}>{error}</p>}
          {!loading && !error && clients.length === 0 && (
            <p className="muted" style={{ padding: 18 }}>No active clients yet. <Link to="/dashboard/clients">Add a client →</Link></p>
          )}
          {clients.map((client) => (
            <button
              type="button"
              key={client._id}
              className={`conv-row${active?._id === client._id ? ' active' : ''}`}
              onClick={() => setActive(client)}
            >
              <div className="client-avatar">{initials(client.name)}</div>
              <div>
                <b>{client.name}</b>
                <span>{client.email}</span>
              </div>
            </button>
          ))}
        </aside>
        <section className="chat-panel">
          {active && roomId ? (
            <>
              <div className="chat-head">
                <div className="client-avatar">{initials(active.name)}</div>
                <div>
                  <b>{active.name}</b>
                  <span>{active.email}</span>
                </div>
                <Link className="btn btn-outline" to={`/dashboard/clients/${active._id}`}>View client</Link>
              </div>
              <ChatWindow roomId={roomId} currentUserId={therapist._id} currentUserRole="therapist" />
            </>
          ) : (
            <div className="muted" style={{ margin: 'auto', padding: 30, textAlign: 'center' }}>
              Select an active client to start a secure conversation.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
