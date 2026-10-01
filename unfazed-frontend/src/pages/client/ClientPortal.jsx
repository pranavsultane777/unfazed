import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import ChatWindow from '../../components/chat/ChatWindow';
import NotificationBell from '../../components/common/NotificationBell';
import axiosInstance from '../../api/axiosInstance';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { useClientAuth } from '../../context/ClientAuthContext';
import { formatCurrency } from '../../utils/formatters';

const ClientPortal = () => {
  const { client, logoutClient } = useClientAuth();
  const [portal, setPortal] = useState(null);
  const [form, setForm] = useState({
    age: '',
    gender: '',
    occupation: '',
    presentingConcern: '',
    history: '',
    consentGiven: false,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [packageSlots, setPackageSlots] = useState([]);
  const [selectedPackageSlot, setSelectedPackageSlot] = useState('');
  const [bookingPackage, setBookingPackage] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');

  const load = async () => {
    try {
      const { data } = await axiosInstance.get('/client-portal/me');
      setPortal(data);
      const intake = data.client?.intake || {};
      setForm({
        age: intake.demographics?.age || '',
        gender: intake.demographics?.gender || '',
        occupation: intake.demographics?.occupation || '',
        presentingConcern: intake.presentingConcern || '',
        history: intake.history || '',
        consentGiven: Boolean(intake.consentGiven),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your client portal');
    }
  };

  useEffect(() => {
    document.title = 'Client Portal – Unfazed';
    if (client) load();
  }, [client]);

  useEffect(() => {
    const slug = portal?.client?.therapist?.slug;
    if (!slug || !portal?.package) {
      setPackageSlots([]);
      return;
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    axiosInstance
      .get(`/scheduling/slots/${slug}?timezone=${encodeURIComponent(timezone)}`)
      .then((response) => setPackageSlots(Array.isArray(response.data?.slots) ? response.data.slots : []))
      .catch(() => setPackageSlots([]));
  }, [portal?.client?.therapist?.slug, portal?.package]);

  const bookWithPackage = async () => {
    if (!selectedPackageSlot) return;
    const slot = packageSlots.find((item) => item.startUtc === selectedPackageSlot);
    if (!slot) return;
    setBookingPackage(true);
    setBookingMessage('');
    setError('');
    try {
      await axiosInstance.post('/scheduling/book', {
        slug: portal.client.therapist.slug,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        usePackage: true,
      });
      setBookingMessage('Session successfully booked using your active package credit!');
      setSelectedPackageSlot('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not book the session with your package.');
    } finally {
      setBookingPackage(false);
    }
  };

  if (!client) return <Navigate to="/client/login" replace />;
  if (!portal) {
    return (
      <div className="portal-page">
        <header className="portal-nav">
          <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
          <button type="button" className="logout-btn" onClick={logoutClient}>Log out</button>
        </header>
        <div className="loading-page">{error || 'Loading client portal…'}</div>
      </div>
    );
  }

  const rawTherapist = portal.client?.therapist || client.therapist;
  const therapistId = rawTherapist && typeof rawTherapist === 'object' ? rawTherapist._id : rawTherapist;
  const roomId = therapistId && portal.client?._id ? [String(therapistId), String(portal.client._id)].sort().join('-') : null;

  const downloadInvoice = async (paymentId, invoiceNumber) => {
    try {
      const response = await axiosInstance.get(`/payments/${paymentId}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber || 'unfazed-invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not download invoice');
    }
  };

  const saveIntake = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!form.consentGiven) {
      setError('Please accept the digital consent agreement before submitting.');
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put('/client-portal/intake', {
        demographics: {
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender.trim(),
          occupation: form.occupation.trim(),
        },
        presentingConcern: form.presentingConcern.trim(),
        history: form.history.trim(),
        consentGiven: true,
      });
      setMessage('Your clinical intake details and digital consent have been saved with an audit timestamp.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save intake details');
    } finally {
      setSaving(false);
    }
  };

  const sessions = Array.isArray(portal.sessions) ? portal.sessions : [];
  const payments = Array.isArray(portal.payments) ? portal.payments : [];
  const sharedNotes = (Array.isArray(portal.notes) ? portal.notes : []).filter((note) => note.type === 'shared');

  return (
    <div className="portal-page">
      <header className="portal-nav">
        <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <NotificationBell />
          <button type="button" className="btn btn-outline btn-sm" onClick={logoutClient}>
            Log out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '30px auto', padding: '0 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>Welcome back, {portal.client?.name}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Therapist: <b>{portal.client?.therapist?.name || 'Your Therapist'}</b>
              {portal.client?.therapist?.slug && (
                <Link to={`/${portal.client.therapist.slug}`} style={{ marginLeft: 10, color: '#146df5', fontWeight: 600 }}>
                  View Profile ↗
                </Link>
              )}
            </p>
          </div>
        </div>

        {!portal.client?.intake?.consentGiven && (
          <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 13 }}>
            <b>Action Required:</b> Please complete your clinical intake and digital consent below before your first scheduled session.
          </div>
        )}

        {/* Intake & Digital Consent Section */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Clinical Intake & Digital Consent</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>
            This information is private and accessible only to your therapist for your clinical care.
          </p>
          <form onSubmit={saveIntake} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="field-label">Age</label>
                <input
                  className="inner-search"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 28"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="field-label">Gender</label>
                <input
                  className="inner-search"
                  placeholder="e.g. Female / Male / Non-binary"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="field-label">Occupation</label>
                <input
                  className="inner-search"
                  placeholder="e.g. Software Engineer"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="field-label">Presenting Concern *</label>
              <textarea
                className="inner-search"
                rows={3}
                placeholder="What challenges or goals bring you to therapy?"
                value={form.presentingConcern}
                onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="field-label">Relevant History *</label>
              <textarea
                className="inner-search"
                rows={3}
                placeholder="Briefly describe previous therapy, medical history, or current life events..."
                value={form.history}
                onChange={(e) => setForm({ ...form, history: e.target.value })}
                required
              />
            </div>

            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.consentGiven}
                onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })}
                style={{ marginTop: 2 }}
              />
              <span>
                I confirm the information above is accurate and provide digital consent for my clinical intake to be recorded and maintained by my therapist.
              </span>
            </label>

            {portal.client?.intake?.consentGiven && portal.client?.intake?.consentTimestamp && (
              <small className="muted">
                Digital consent recorded: {new Date(portal.client.intake.consentTimestamp).toLocaleString()}
              </small>
            )}

            {message && <div className="success-msg" role="status">{message}</div>}
            {error && <div className="error-msg" role="alert">{error}</div>}

            <div style={{ marginTop: 6 }}>
              <button className="btn btn-blue" disabled={saving}>
                {saving ? 'Saving…' : 'Save Intake & Consent'}
              </button>
            </div>
          </form>
        </section>

        {/* Package Booking Section */}
        {portal.package && (
          <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Active Session Package</h3>
            <p className="muted" style={{ margin: '0 0 14px' }}>
              {portal.package.package?.name || 'Session Package'} · {portal.package.sessionsTotal - portal.package.sessionsUsed} sessions remaining of {portal.package.sessionsTotal} total.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="field-input"
                value={selectedPackageSlot}
                onChange={(e) => setSelectedPackageSlot(e.target.value)}
                style={{ flex: 1, minWidth: 260 }}
              >
                <option value="">Select an available time slot</option>
                {packageSlots.map((slot) => (
                  <option key={slot.startUtc} value={slot.startUtc}>
                    {slot.date} · {slot.startTime} – {slot.endTime} ({slot.timezone})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-blue"
                onClick={bookWithPackage}
                disabled={!selectedPackageSlot || bookingPackage}
              >
                {bookingPackage ? 'Booking…' : 'Book with Package Credit'}
              </button>
            </div>
            {bookingMessage && <div className="success-msg" style={{ marginTop: 12 }}>{bookingMessage}</div>}
            {packageSlots.length === 0 && (
              <p className="muted" style={{ margin: '10px 0 0' }}>No open slots available right now. Please check back soon.</p>
            )}
          </section>
        )}

        {/* Sessions Section */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Upcoming & Past Appointments</h3>
          {sessions.length === 0 ? (
            <div className="empty-state">No appointments booked yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td><b>{s.date}</b></td>
                    <td>{s.startTime} – {s.endTime}</td>
                    <td>
                      <span className="tag" style={{ textTransform: 'capitalize' }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Payments Section */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Payment History & Invoices</h3>
          {payments.length === 0 ? (
            <div className="empty-state">No payment receipts recorded yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt / Invoice</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td><b>{formatCurrency(p.amount)}</b></td>
                    <td><span className="tag">{p.status}</span></td>
                    <td>
                      {p.invoiceGenerated ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => downloadInvoice(p._id, p.invoiceNumber)}
                        >
                          ⬇ PDF Invoice ({p.invoiceNumber || 'Download'})
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Shared Notes Section */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Notes Shared by Therapist</h3>
          {sharedNotes.length === 0 ? (
            <div className="empty-state">Your therapist has not shared any session notes yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {sharedNotes.map((note) => (
                <article key={note._id} style={{ borderTop: '1px solid #eef2f7', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="tag" style={{ textTransform: 'uppercase' }}>{note.format || 'Note'}</span>
                    <small className="muted">{new Date(note.updatedAt || note.createdAt).toLocaleString()}</small>
                  </div>
                  <div
                    style={{ fontSize: 13, lineHeight: 1.6, color: '#334155' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Chat Section */}
        <section className="panel" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Direct Message Therapist</h3>
          {roomId ? (
            <ChatWindow roomId={roomId} currentUserRole="client" />
          ) : (
            <div className="empty-state">Connecting to chat…</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ClientPortal;
