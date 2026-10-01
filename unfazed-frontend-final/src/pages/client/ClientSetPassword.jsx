import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useClientAuth } from '../../context/ClientAuthContext';

const ClientSetPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginClient } = useClientAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post('/client-auth/set-password', {
        email: email.trim().toLowerCase(),
        password,
      });
      loginClient(res.data);
      navigate('/client/portal');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not set up account. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="brand-new">
            <span className="brand-icon">♢</span>
            Unfazed
          </Link>
          <h2>Activate Client Account</h2>
          <p>
            Use the same email you booked your session with to create a password for your client portal.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="setup-email">Booking Email Address</label>
            <input
              className="field-input"
              type="email"
              id="setup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
              autoFocus={!email}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="setup-password">Create Password</label>
              <button
                type="button"
                className="link-button"
                style={{ fontSize: 11 }}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              className="field-input"
              type={showPassword ? 'text' : 'password'}
              id="setup-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="setup-confirm">Confirm Password</label>
            <input
              className="field-input"
              type={showPassword ? 'text' : 'password'}
              id="setup-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              minLength={6}
              required
            />
          </div>

          {error && <div className="error-msg" role="alert">{error}</div>}

          <button
            type="submit"
            className="btn btn-blue full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Activating…' : 'Set Password & Enter Portal'}
          </button>
        </form>

        <div className="auth-footer">
          Already activated? <Link to="/client/login">Log in here</Link>
        </div>

        <div className="auth-switch">
          Are you a therapist? <Link to="/login">Therapist workspace login →</Link>
        </div>
      </div>
    </div>
  );
};

export default ClientSetPassword;
