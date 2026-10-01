import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Calendar from '../../components/scheduling/Calendar';
import SlotPicker from '../../components/scheduling/SlotPicker';
import axiosInstance from '../../api/axiosInstance';
import { formatCurrency } from '../../utils/formatters';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

const BookingPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [slotData, setSlotData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [clientInfo, setClientInfo] = useState({ name: '', email: '', phone: '' });
  const [intake, setIntake] = useState({
    age: '',
    gender: '',
    occupation: '',
    presentingConcern: '',
    history: '',
    consentGiven: false,
  });
  const [error, setError] = useState('');
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingIntake, setSavingIntake] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('month');

  useEffect(() => {
    let mounted = true;
    const fetchSlots = async () => {
      try {
        const { data } = await axiosInstance.get(`/scheduling/slots/${slug}?timezone=${encodeURIComponent(clientTimezone)}`);
        if (!mounted) return;
        setSlotData(data);
        if (data?.slots?.length) {
          setCalDate(new Date(data.slots[0].startUtc));
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Could not load therapist availability');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSlots();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const events = useMemo(() => {
    if (!slotData?.slots) return [];
    return slotData.slots.map((slot) => ({
      ...slot,
      title: `${slot.startTime} – ${slot.endTime}`,
      start: new Date(slot.startUtc),
      end: new Date(slot.endUtc),
    }));
  }, [slotData]);

  const updateClientInfo = (key, value) => setClientInfo((prev) => ({ ...prev, [key]: value }));
  const updateIntake = (key, value) => setIntake((prev) => ({ ...prev, [key]: value }));

  const proceedToPayment = () => {
    navigate(`/${slug}/payment`, {
      state: {
        booking: {
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          timezone: clientTimezone,
          display: `${selectedSlot.date} · ${selectedSlot.startTime} – ${selectedSlot.endTime} (${clientTimezone})`,
        },
        clientInfo,
        intakeCompleted: true,
      },
    });
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    if (!clientInfo.name.trim() || !clientInfo.email.trim()) {
      setError('Please enter your full name and email address.');
      return;
    }
    if (!intake.presentingConcern.trim() || !intake.history.trim()) {
      setError('Please complete both presenting concern and relevant history in the intake section.');
      return;
    }
    if (!intake.consentGiven) {
      setError('Please accept the digital consent agreement before booking your session.');
      return;
    }

    setError('');
    setRequiresLogin(false);
    setSavingIntake(true);
    try {
      await axiosInstance.post('/client-portal/public-intake', {
        slug,
        name: clientInfo.name.trim(),
        email: clientInfo.email.trim().toLowerCase(),
        phone: clientInfo.phone.trim(),
        demographics: {
          age: intake.age ? Number(intake.age) : undefined,
          gender: intake.gender.trim(),
          occupation: intake.occupation.trim(),
        },
        presentingConcern: intake.presentingConcern.trim(),
        history: intake.history.trim(),
        consentGiven: true,
      });

      proceedToPayment();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'CLIENT_AUTH_REQUIRED') {
        setRequiresLogin(true);
        setError('Your client account is already activated. You can log in to your portal, or proceed directly to payment.');
      } else {
        setError(data?.message || 'Could not save your intake form. Please try again.');
      }
    } finally {
      setSavingIntake(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-page">
        <header className="portal-nav">
          <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
          <Link to={`/${slug}`} className="btn btn-outline btn-sm">← Back to Profile</Link>
        </header>
        <div className="loading-page">Loading available appointment slots…</div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <header className="portal-nav">
        <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to={`/${slug}`} className="btn btn-outline btn-sm">← Back to Profile</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '30px auto', padding: '0 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, margin: '0 0 6px' }}>Book a Therapy Session</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Select an available time slot below. All slots are shown converted to your local timezone: <b>{clientTimezone}</b>
            </p>
          </div>
          {slotData?.sessionPrice != null && (
            <span className="tag" style={{ fontSize: 12, padding: '8px 12px' }}>
              Session Fee: <b>{formatCurrency(slotData.sessionPrice)}</b>
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 12 }}>
              No open appointments are currently scheduled in this window.
            </p>
            <p className="muted" style={{ marginBottom: 20 }}>
              The therapist may have all current slots booked or is updating their working hours.
            </p>
            <Link to={`/${slug}`} className="btn btn-blue">Return to Profile</Link>
          </div>
        ) : (
          <div className="panel" style={{ padding: 18 }}>
            <div style={{ height: 560 }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                onSelectEvent={setSelectedSlot}
                date={calDate}
                view={calView}
                onNavigate={setCalDate}
                onView={setCalView}
                style={{ height: '100%' }}
              />
            </div>
          </div>
        )}

        {selectedSlot && (
          <section className="panel" style={{ marginTop: 24, padding: 24 }}>
            <div className="panel-head" style={{ padding: '0 0 16px', borderBottom: '1px solid #eef2f7' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Selected Appointment</h3>
                <SlotPicker slot={selectedSlot} timezone={clientTimezone} />
              </div>
              <span className="tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                Therapist local: {selectedSlot.therapistDate} · {selectedSlot.therapistStartTime} – {selectedSlot.therapistEndTime} ({selectedSlot.therapistTimezone})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 20 }}>
              {/* Client Contact Info */}
              <div>
                <h4 style={{ margin: '0 0 14px', fontSize: 14 }}>1. Your Contact Information</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="field-label">Full Name *</label>
                    <input
                      className="inner-search"
                      placeholder="e.g. Rahul Verma"
                      value={clientInfo.name}
                      onChange={(e) => updateClientInfo('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="field-label">Email Address *</label>
                    <input
                      className="inner-search"
                      type="email"
                      placeholder="rahul@example.com"
                      value={clientInfo.email}
                      onChange={(e) => updateClientInfo('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="field-label">Phone Number (Optional)</label>
                    <input
                      className="inner-search"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={clientInfo.phone}
                      onChange={(e) => updateClientInfo('phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Intake & Consent */}
              <div>
                <h4 style={{ margin: '0 0 14px', fontSize: 14 }}>2. Clinical Intake & Digital Consent</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <input
                      className="inner-search"
                      type="number"
                      min="1"
                      max="120"
                      placeholder="Age"
                      value={intake.age}
                      onChange={(e) => updateIntake('age', e.target.value)}
                    />
                    <input
                      className="inner-search"
                      placeholder="Gender"
                      value={intake.gender}
                      onChange={(e) => updateIntake('gender', e.target.value)}
                    />
                    <input
                      className="inner-search"
                      placeholder="Occupation"
                      value={intake.occupation}
                      onChange={(e) => updateIntake('occupation', e.target.value)}
                    />
                  </div>

                  <textarea
                    className="inner-search"
                    rows={3}
                    placeholder="Presenting concern / Reason for seeking therapy *"
                    value={intake.presentingConcern}
                    onChange={(e) => updateIntake('presentingConcern', e.target.value)}
                    required
                  />

                  <textarea
                    className="inner-search"
                    rows={3}
                    placeholder="Relevant history / Previous therapy experience *"
                    value={intake.history}
                    onChange={(e) => updateIntake('history', e.target.value)}
                    required
                  />

                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={intake.consentGiven}
                      onChange={(e) => updateIntake('consentGiven', e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>
                      I confirm the accuracy of this intake and provide digital consent for my therapist to store this clinical record for our therapeutic relationship.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {error && <div className="error-msg" role="alert" style={{ marginTop: 20 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-blue"
                onClick={handleBook}
                disabled={savingIntake}
              >
                {savingIntake ? 'Saving intake…' : 'Save Intake & Continue to Payment →'}
              </button>

              {requiresLogin && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={proceedToPayment}
                >
                  Continue directly to payment →
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BookingPage;