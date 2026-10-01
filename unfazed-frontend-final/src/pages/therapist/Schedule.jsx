import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import AppShell from '../../components/common/AppShell';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const createEmptyOverride = () => ({
  date: '',
  isBlocked: true,
  startTime: '09:00',
  endTime: '17:00',
});

const Schedule = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'sessions' ? 'sessions' : 'availability';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [sessionDuration, setSessionDuration] = useState(60);
  const [bufferTime, setBufferTime] = useState(0);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
  const [weeklySlots, setWeeklySlots] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionError, setSessionError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAvailabilityAndSessions = async () => {
      try {
        const [availRes, sessionsRes] = await Promise.all([
          axiosInstance.get('/scheduling/availability/me'),
          axiosInstance.get('/scheduling/sessions/me'),
        ]);
        const data = availRes.data || {};
        setSessionDuration(data.sessionDuration || 60);
        setBufferTime(data.bufferTime || 0);
        setTimezone(data.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'));
        setWeeklySlots(Array.isArray(data.weeklySlots) ? data.weeklySlots : []);
        setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
        setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load schedule & availability settings');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailabilityAndSessions();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'sessions' ? { tab: 'sessions' } : {});
  };

  const addSlot = () => {
    setWeeklySlots((prev) => [...prev, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  };

  const updateSlot = (index, field, value) => {
    setWeeklySlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: field === 'dayOfWeek' ? Number(value) : value } : slot))
    );
  };

  const removeSlot = (index) => {
    setWeeklySlots((prev) => prev.filter((_, i) => i !== index));
  };

  const addOverride = () => {
    setOverrides((prev) => [...prev, createEmptyOverride()]);
  };

  const updateOverride = (index, field, value) => {
    setOverrides((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeOverride = (index) => {
    setOverrides((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSessionStatus = async (id, status) => {
    setSessionError('');
    try {
      await axiosInstance.patch(`/scheduling/sessions/${id}/status`, { status });
      setSessions((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
    } catch (err) {
      setSessionError(err.response?.data?.message || 'Could not update session status');
    }
  };

  const validateSchedule = () => {
    const invalidSlot = weeklySlots.some(
      (slot) => !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime
    );
    const invalidOverride = overrides.some(
      (item) => !item.date || (!item.isBlocked && (!item.startTime || !item.endTime || item.startTime >= item.endTime))
    );
    if (invalidSlot) return 'Every weekly working slot must have a start time strictly before its end time.';
    if (invalidOverride) return 'Every override must have a valid date and a start time before end time (unless marked as blocked).';
    return '';
  };

  const handleSave = async () => {
    setError('');
    setMessage('');
    const validationError = validateSchedule();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await axiosInstance.put('/scheduling/availability', {
        sessionDuration: Number(sessionDuration),
        bufferTime: Number(bufferTime),
        timezone,
        weeklySlots,
        overrides,
      });
      setMessage('Schedule, working hours, and blocked overrides saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Calendar & Hours">
        <div className="loading-state" role="status">Loading schedule settings…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Calendar & Sessions"
      subtitle="Configure session durations, recurring weekly working hours, vacation overrides, and appointment attendance."
      action={
        activeTab === 'availability' && (
          <button className="btn btn-blue" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )
      }
    >
      <div style={{ maxWidth: 1000 }}>
        <div className="tab-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'availability'}
            className={`tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => handleTabChange('availability')}
          >
            Availability & Working Hours
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sessions'}
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => handleTabChange('sessions')}
          >
            Sessions & Attendance ({sessions.length})
          </button>
        </div>

        {message && <div className="success-msg" role="status">{message}</div>}
        {error && <div className="error-msg" role="alert">{error}</div>}

        {activeTab === 'availability' ? (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Session Settings */}
            <section className="panel" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Session & Timezone Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label className="field-label">Session Duration</label>
                  <select
                    className="field-input"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                  >
                    {[30, 45, 60, 90].map((n) => (
                      <option key={n} value={n}>{n} minutes</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">Buffer Between Sessions (minutes)</label>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    max="120"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Therapist Timezone (IANA)</label>
                  <input
                    className="field-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Asia/Kolkata"
                  />
                  <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                    Clients see these slots converted dynamically to their local timezone.
                  </small>
                </div>
              </div>
            </section>

            {/* Recurring weekly availability */}
            <section className="panel" style={{ padding: 22 }}>
              <div className="panel-head" style={{ padding: '0 0 16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>Recurring Weekly Availability</h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Define the days and time windows when you accept appointments</span>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={addSlot}>
                  + Add Working Slot
                </button>
              </div>

              {weeklySlots.length === 0 ? (
                <div className="empty-state">No recurring slots configured yet. Click "+ Add Working Slot" to begin.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {weeklySlots.map((slot, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <select
                        className="field-input"
                        style={{ width: 140 }}
                        value={slot.dayOfWeek}
                        onChange={(e) => updateSlot(index, 'dayOfWeek', e.target.value)}
                      >
                        {DAYS.map((day, i) => (
                          <option key={day} value={i}>{day}</option>
                        ))}
                      </select>
                      <input
                        className="field-input"
                        style={{ width: 130 }}
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                      />
                      <span style={{ color: '#64748b', fontSize: 13 }}>to</span>
                      <input
                        className="field-input"
                        style={{ width: 130 }}
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => removeSlot(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Overrides & blocked dates */}
            <section className="panel" style={{ padding: 22 }}>
              <div className="panel-head" style={{ padding: '0 0 16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>One-Time Overrides & Blocked Dates</h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Block off vacations/leaves or override hours for a specific date</span>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={addOverride}>
                  + Add Date Override
                </button>
              </div>

              {overrides.length === 0 ? (
                <div className="empty-state">No date overrides configured. All recurring weekly hours apply.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {overrides.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <input
                        className="field-input"
                        style={{ width: 160 }}
                        type="date"
                        value={item.date}
                        onChange={(e) => updateOverride(index, 'date', e.target.value)}
                        required
                      />
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.isBlocked}
                          onChange={(e) => updateOverride(index, 'isBlocked', e.target.checked)}
                        />
                        <b>Block Entire Day (Leave)</b>
                      </label>
                      {!item.isBlocked && (
                        <>
                          <input
                            className="field-input"
                            style={{ width: 130 }}
                            type="time"
                            value={item.startTime || ''}
                            onChange={(e) => updateOverride(index, 'startTime', e.target.value)}
                          />
                          <span style={{ color: '#64748b', fontSize: 13 }}>to</span>
                          <input
                            className="field-input"
                            style={{ width: 130 }}
                            type="time"
                            value={item.endTime || ''}
                            onChange={(e) => updateOverride(index, 'endTime', e.target.value)}
                          />
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => removeOverride(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Sessions and Attendance */
          <section className="panel" style={{ padding: 22 }}>
            <div className="panel-head" style={{ padding: '0 0 16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>Session Attendance & Status</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Update statuses after appointments. These power the analytics attendance and no-show metrics.
                </span>
              </div>
            </div>

            {sessionError && <div className="error-msg" role="alert">{sessionError}</div>}

            {sessions.length === 0 ? (
              <div className="empty-state">No booked or completed sessions yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #edf1f6',
                      paddingTop: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: 14 }}>{session.client?.name || 'Client'}</b>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {session.date} · {session.startTime} – {session.endTime} ({session.timezone || timezone})
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tag" style={{ textTransform: 'capitalize' }}>{session.status}</span>
                      {session.status === 'booked' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => updateSessionStatus(session._id, 'completed')}
                          >
                            ✓ Completed
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => updateSessionStatus(session._id, 'no-show')}
                          >
                            ! No-show
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => updateSessionStatus(session._id, 'cancelled')}
                          >
                            ✕ Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
};

export default Schedule;
