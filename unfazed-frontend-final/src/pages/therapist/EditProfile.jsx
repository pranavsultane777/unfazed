import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/common/AppShell';

const EditProfile = () => {
  const { therapist, updateTherapist } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: therapist?.name || '',
    bio: therapist?.bio || '',
    specializations: (therapist?.specializations || []).join(', '),
    languages: (therapist?.languages || []).join(', '),
    sessionPrice: therapist?.sessionPrice ?? '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axiosInstance
      .get('/therapist/me')
      .then((res) => {
        if (!mounted || !res.data) return;
        const profile = res.data;
        updateTherapist(profile);
        setFormData({
          name: profile.name || '',
          bio: profile.bio || '',
          specializations: (profile.specializations || []).join(', '),
          languages: (profile.languages || []).join(', '),
          sessionPrice: profile.sessionPrice ?? '',
        });
      })
      .catch((err) => {
        if (mounted) {
          setError(err.response?.data?.message || 'Could not load existing profile.');
        }
      })
      .finally(() => {
        if (mounted) setInitialLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        specializations: formData.specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        languages: formData.languages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        sessionPrice: Number(formData.sessionPrice),
      };

      const { data } = await axiosInstance.put('/therapist/me', payload);
      const updatedTherapist = data?.therapist || data;
      if (updatedTherapist && typeof updatedTherapist === 'object') {
        updateTherapist(updatedTherapist);
      }
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Edit Profile"
      subtitle="Keep your therapist profile, specializations, and public booking fee up to date."
    >
      <div className="panel profile-form-panel" style={{ maxWidth: 680, padding: 24 }}>
        {initialLoading ? (
          <div className="loading-state" role="status">Loading current profile data…</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="form-group">
              <label className="field-label" htmlFor="profile-name">Full Name *</label>
              <input
                className="inner-search"
                type="text"
                id="profile-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="profile-bio">Bio / Philosophy</label>
              <textarea
                className="inner-search"
                id="profile-bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                style={{ resize: 'vertical' }}
                placeholder="Share your approach, experience, and what clients can expect..."
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="profile-specializations">Specializations (comma separated)</label>
              <input
                className="inner-search"
                type="text"
                id="profile-specializations"
                name="specializations"
                value={formData.specializations}
                onChange={handleChange}
                placeholder="e.g. Anxiety, CBT, Trauma, Relationship Counseling"
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="profile-languages">Languages (comma separated)</label>
              <input
                className="inner-search"
                type="text"
                id="profile-languages"
                name="languages"
                value={formData.languages}
                onChange={handleChange}
                placeholder="e.g. English, Hindi"
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="profile-price">Single Session Price (₹) *</label>
              <input
                className="inner-search"
                type="number"
                min="1"
                step="1"
                id="profile-price"
                name="sessionPrice"
                value={formData.sessionPrice}
                onChange={handleChange}
                required
                placeholder="e.g. 1500"
              />
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                Clients are charged this configured amount for a single appointment checkout.
              </small>
            </div>

            {message && <div className="success-msg" role="status">{message}</div>}
            {error && <div className="error-msg" role="alert">{error}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
              <button className="btn btn-blue" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              {therapist?.slug && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate(`/${therapist.slug}`)}
                >
                  View Public Profile ↗
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
};

export default EditProfile;