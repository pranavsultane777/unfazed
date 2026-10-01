import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
      });

      login(response.data);
      navigate(from, { replace: true });
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
          <h2>Therapist Login</h2>
          <p>Access your schedule, client records and practice analytics</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              className="field-input"
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="therapist@example.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
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
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
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
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have a therapist account? <Link to="/register">Sign up</Link>
        </div>

        <div className="auth-switch">
          Are you a client? <Link to="/client/login">Log in to Client Portal →</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;