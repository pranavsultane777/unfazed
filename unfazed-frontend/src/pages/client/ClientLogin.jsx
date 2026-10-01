import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useClientAuth } from '../../context/ClientAuthContext';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginClient } = useClientAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axiosInstance.post('/client-auth/login', {
        email: email.trim(),
        password,
      });
      loginClient(res.data);
      navigate('/client/portal');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
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
          <h2>Client Portal Login</h2>
          <p>Access your appointments, shared notes, invoices and chat</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="client-email">Email Address</label>
            <input
              className="field-input"
              type="email"
              id="client-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="client-password">Password</label>
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
              id="client-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? 'Logging in…' : 'Log In to Client Portal'}
          </button>
        </form>

        <div className="auth-footer">
          Booked a session but haven't activated your password yet?{' '}
          <Link to="/client/set-password">Set up password</Link>
        </div>

        <div className="auth-switch">
          Are you a therapist? <Link to="/login">Therapist workspace login →</Link>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
