import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import ChatWindow from '../../components/chat/ChatWindow';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/common/AppShell';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ClientDetail() {
  const { id } = useParams();
  const { therapist } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ age: '', gender: '', occupation: '', presentingConcern: '', history: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: result } = await axiosInstance.get(`/clients/${id}`);
      setData(result);
      const intake = result.client.intake || {};
      setForm({ age: intake.demographics?.age || '', gender: intake.demographics?.gender || '', occupation: intake.demographics?.occupation || '', presentingConcern: intake.presentingConcern || '', history: intake.history || '' });
    } catch (err) { setError(err.response?.data?.message || 'Could not load client'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const saveIntake = async (e) => {
    e.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      await axiosInstance.put(`/clients/${id}/intake`, { demographics: { age: form.age, gender: form.gender, occupation: form.occupation }, presentingConcern: form.presentingConcern, history: form.history });
      setMessage('Intake details saved. Digital consent remains client-controlled.'); await load();
    } catch (err) { setError(err.response?.data?.message || 'Could not save intake'); }
    finally { setSaving(false); }
  };

  if (!data) return <AppShell title="Client"><div className={error ? 'error-msg' : 'loading-state'} role={error ? 'alert' : 'status'}>{error || 'Loading client…'}</div></AppShell>;
  const { client, sessions = [], payments = [], notes = [], package: packageInfo } = data;
  const roomId = [therapist?._id, client._id].sort().join('-');

  return (
    <AppShell title={client.name} subtitle={`${client.email} · ${client.phone || 'No phone'}`} action={<Link className="btn btn-outline" to="/dashboard/clients">← Back to clients</Link>}>
    <div style={{ maxWidth: 1100 }}>
      <p className="muted">Status: <b>{client.status}</b></p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div className="panel"><b>Intake status</b><p>{client.intake?.consentGiven ? `Consent given ${new Date(client.intake.consentTimestamp).toLocaleString()}` : 'Consent pending from client'}</p></div>
        <div className="panel"><b>Sessions</b><p>{sessions.length}</p></div>
        <div className="panel"><b>Paid transactions</b><p>{payments.length}</p></div>
        <div className="panel"><b>Package</b><p>{packageInfo ? `${packageInfo.package?.name || 'Package'} · ${packageInfo.sessionsTotal - packageInfo.sessionsUsed} remaining` : 'No active package'}</p></div>
      </section>

      <section className="panel" style={{ marginTop: 20, padding: 20 }}>
        <h3>Client Intake</h3>
        <form onSubmit={saveIntake} style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <input type="number" min="1" max="120" placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            <input placeholder="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
            <input placeholder="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </div>
          <textarea rows={3} placeholder="Presenting concern" value={form.presentingConcern} onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })} />
          <textarea rows={4} placeholder="History" value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })} />
          <p style={{ fontSize: 13, color: '#666' }}>Digital consent is captured by the authenticated client in the client portal and stored with an audit timestamp.</p>
          {message && <p style={{ color: 'green' }}>{message}</p>}{error && <p style={{ color: '#c0392b' }}>{error}</p>}
          <button disabled={saving}>{saving ? 'Saving...' : 'Save intake details'}</button>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 20, padding: 20 }}>
        <h3>Session History</h3>
        {sessions.length === 0 ? <p>No sessions yet.</p> : <table><thead><tr><th>Date</th><th>Time</th><th>Status</th><th>Notes</th></tr></thead><tbody>{sessions.map((s) => <tr key={s._id}><td>{s.date}</td><td>{s.startTime} - {s.endTime}</td><td>{s.status}</td><td><Link to={`/dashboard/clients/${id}/notes/${s._id}`}>Open notes</Link></td></tr>)}</tbody></table>}
      </section>

      <section className="panel" style={{ marginTop: 20, padding: 20 }}>
        <h3>Payment History</h3>
        {payments.length === 0 ? <p>No payments recorded.</p> : <table><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Transaction</th></tr></thead><tbody>{payments.map((p) => <tr key={p._id}><td>{new Date(p.createdAt).toLocaleDateString()}</td><td>{money(p.amount)}</td><td>{p.status}</td><td>{p.gateway_transaction_id || p.gateway_order_id || '—'}</td></tr>)}</tbody></table>}
      </section>

      <section className="panel" style={{ marginTop: 20, padding: 20 }}>
        <h3>Clinical Notes</h3>
        {notes.length === 0 ? <p>No notes yet.</p> : notes.map((note) => <article key={note._id} style={{ borderTop: '1px solid #eee', padding: '12px 0' }}><b>{note.type} · {note.format}</b><div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }} /></article>)}
        <Link to={`/dashboard/clients/${id}/notes`}>Open full notes workspace →</Link>
      </section>

      <section style={{ marginTop: 20 }}><h3>Secure chat</h3><ChatWindow roomId={roomId} currentUserId={therapist._id} currentUserRole="therapist" /></section>
    </div>
    </AppShell>
  );
}
