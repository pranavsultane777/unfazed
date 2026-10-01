import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import axiosInstance from '../../api/axiosInstance';
import AppShell from '../../components/common/AppShell';
import NoteEditor from '../../components/notes/NoteEditor';
import SoapTemplate from '../../components/notes/SoapTemplate';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const formatDate = (session) => session ? `${session.date} · ${session.startTime} – ${session.endTime}` : 'No session selected';

export default function Notes() {
  const { clientId, sessionId: routeSessionId } = useParams();
  const [clientData, setClientData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(routeSessionId || '');
  const [type, setType] = useState('private');
  const [format, setFormat] = useState('freeform');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const editor = useEditor({ extensions: [StarterKit], content: '' });

  const load = useCallback(async () => {
    try {
      const [clientResponse, notesResponse] = await Promise.all([
        axiosInstance.get(`/clients/${clientId}`),
        axiosInstance.get(`/notes/client/${clientId}`),
      ]);
      setClientData(clientResponse.data);
      setNotes(notesResponse.data || []);
      const sessions = clientResponse.data?.sessions || [];
      if (!selectedSessionId && sessions.length) {
        const preferred = sessions.find((s) => s.status === 'booked') || sessions[0];
        setSelectedSessionId(preferred._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load notes workspace');
    }
  }, [clientId, selectedSessionId]);

  useEffect(() => { load(); }, [load]);

  const selectedSession = useMemo(
    () => (clientData?.sessions || []).find((s) => String(s._id) === String(selectedSessionId)) || null,
    [clientData, selectedSessionId],
  );

  const save = async () => {
    if (!editor || editor.isEmpty) {
      setMsg('Write a note first');
      return;
    }
    if (!selectedSessionId) {
      setError('Select a session before saving a clinical note.');
      return;
    }
    setSaving(true); setError(''); setMsg('');
    try {
      await axiosInstance.post('/notes', {
        clientId,
        sessionId: selectedSessionId,
        type,
        format,
        content: editor.getHTML(),
      });
      editor.commands.clearContent();
      setMsg('Note saved successfully.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save note');
    } finally { setSaving(false); }
  };

  const markCompleted = async () => {
    if (!selectedSessionId) return;
    setMarking(true); setError(''); setMsg('');
    try {
      await axiosInstance.patch(`/scheduling/sessions/${selectedSessionId}/status`, { status: 'completed' });
      setMsg('Session marked as completed.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update session');
    } finally { setMarking(false); }
  };

  if (!clientData) return <div style={{ padding: 40 }}>{error || 'Loading notes workspace...'}</div>;

  const { client, sessions = [], package: packageInfo } = clientData;
  const remaining = packageInfo ? Math.max(0, Number(packageInfo.sessionsTotal || 0) - Number(packageInfo.sessionsUsed || 0)) : 0;
  const used = packageInfo ? Number(packageInfo.sessionsUsed || 0) : 0;
  const total = packageInfo ? Number(packageInfo.sessionsTotal || 0) : 0;

  return (
    <AppShell
      title="Session Notes"
      subtitle="Document each session securely with private/shared access and SOAP/DAP templates."
      action={(
        <div className="head-actions">
          <button className="btn btn-blue" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
          <button className="btn btn-outline" onClick={markCompleted} disabled={!selectedSession || selectedSession.status === 'completed' || marking}>
            {marking ? 'Updating…' : '☑ Mark as Completed'}
          </button>
        </div>
      )}
    >
      <div className="notes-layout">
        <section className="panel note-editor">
          <div className="back-link"><Link to={`/dashboard/clients/${clientId}`}>← Back to Client</Link></div>
          <div className="note-client">
            <div className="large-avatar">{client.name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div><h2>{client.name}</h2><span>{selectedSession ? formatDate(selectedSession) : 'Choose a session below'}</span></div>
          </div>

          <div style={{ margin: '16px 0' }}>
            <label className="field-label">Session</label>
            <select className="filter-btn full" value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              <option value="">Select a session</option>
              {sessions.map((session) => <option key={session._id} value={session._id}>{formatDate(session)} · {session.status}</option>)}
            </select>
          </div>

          <div className="note-tabs">
            <button className={type === 'private' ? 'selected' : ''} onClick={() => setType('private')}>Private Notes</button>
            <button className={type === 'shared' ? 'selected' : ''} onClick={() => setType('shared')}>Shared Notes (Client)</button>
          </div>

          <div style={{ margin: '14px 0' }}>
            <label className="field-label">Note format</label>
            <div className="note-format-row">
              {['freeform', 'soap', 'dap'].map((item) => (
                <button key={item} type="button" className={`format-chip ${format === item ? 'selected' : ''}`} onClick={() => setFormat(item)}>
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {format === 'soap' && <SoapTemplate onInsert={(html) => editor?.commands.setContent(html)} />}
          {format === 'dap' && <SoapTemplate mode="dap" onInsert={(html) => editor?.commands.setContent(html)} />}
          <NoteEditor editor={editor} />
          {msg && <div className="success-msg">{msg}</div>}
          {error && <div className="error-msg">{error}</div>}
        </section>

        <aside className="panel details-card">
          <h3>Session Details</h3>
          {selectedSession ? (
            <>
              <p>▣ <b>{selectedSession.date}</b></p>
              <p>◷ <b>{selectedSession.startTime} – {selectedSession.endTime}</b></p>
              <p>◌ <b>{Math.round((new Date(`1970-01-01T${selectedSession.endTime}:00`) - new Date(`1970-01-01T${selectedSession.startTime}:00`)) / 60000)} minutes</b></p>
              <p>● <b style={{ textTransform: 'capitalize' }}>{selectedSession.status}</b></p>
              <p>⌁ <b>{selectedSession.timezone || 'Asia/Kolkata'}</b></p>
            </>
          ) : <p className="muted">Choose a session to see details.</p>}
          <hr />
          <h3>Client Package</h3>
          {packageInfo ? <><b>{remaining} sessions remaining</b><div className="progress"><span style={{ width: `${total ? Math.min(100, (used / total) * 100) : 0}%` }} /></div><small>{used} / {total} used</small></> : <p className="muted">No active package.</p>}
        </aside>
      </div>

      <section className="panel past-notes">
        <div className="panel-head"><h3>Previous Notes</h3><span>{notes.length} note{notes.length === 1 ? '' : 's'}</span></div>
        {notes.length ? notes.map((note) => (
          <article key={note._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <b>{note.type === 'private' ? '🔒 Private' : '◉ Shared'} · {String(note.format || 'freeform').toUpperCase()}</b>
              <span>{new Date(note.createdAt).toLocaleString()}</span>
            </div>
            {note.session && <small>{formatDate(note.session)}</small>}
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }} />
          </article>
        )) : <p className="muted">No previous notes yet.</p>}
      </section>
    </AppShell>
  );
}
