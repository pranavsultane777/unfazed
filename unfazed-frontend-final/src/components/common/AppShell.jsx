import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useEntitlement from '../../hooks/useEntitlement';
import NotificationBell from './NotificationBell';
import { useState } from 'react';
import { getInitials } from '../../utils/formatters';
const nav = [
  ['Dashboard', '/dashboard', '⌂'],
   ['Calendar & Hours', '/dashboard/schedule', '▣'],
  ['Clients (CRM)', '/dashboard/clients', '♙'],
  ['Clinical Notes', '/dashboard/notes', '▤'],
  ['Session Packages', '/dashboard/packages', '◫'],
  ['Analytics', '/dashboard/analytics', '⌁'],
  ['Messages', '/dashboard/messages', '◌'],
  ['Settings', '/dashboard/edit-profile', '⚙'],
];
export default function AppShell({ children, title, subtitle, action }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { therapist, logout } = useAuth();
  const { tier } = useEntitlement();
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (path) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
  const isTopTier = Boolean(tier?.isHighestTier);
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="app-shell">
      <button className="mobile-menu-toggle" type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen((v) => !v)}>☰</button>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link to="/dashboard" className="side-brand" onClick={() => setMobileOpen(false)}><span className="brand-icon">♢</span><span>Unfazed</span></Link>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Therapist navigation">
          {nav.map(([label, path, icon]) => {
            const target = path;
            return <Link key={label} aria-current={active(target) ? 'page' : undefined} className={active(target) ? 'side-link active' : 'side-link'} to={target} onClick={() => setMobileOpen(false)}><span aria-hidden="true">{icon}</span>{label}</Link>;
          })}
        </nav>
         <div className="side-bottom">
          {!isTopTier && (
            <div className="upgrade-card">
              <div className="upgrade-icon">✦</div>
              <b>Grow your practice</b>
              <span>{tier?.tier ? `You're on the ${tier.tier.name} plan. Unlock more clients, note templates and analytics.` : 'Unlock advanced analytics and more.'}</span>
              <Link to="/dashboard/plans" onClick={() => setMobileOpen(false)}>View plans →</Link>
            </div>
          )}
          <div className="profile-mini">
            <Link to="/dashboard/edit-profile" aria-label="Open profile settings" className="profile-mini-main" onClick={() => setMobileOpen(false)}>
              <div><b>{therapist?.name || 'Therapist'}</b><span>Therapist</span></div>
            </Link>
            <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" type="button" onClick={() => setMobileOpen(false)} />}
      <main className="shell-main">
        <header className="topbar">
          <Link className="search-box" to="/dashboard/clients" aria-label="Open client search"><span aria-hidden="true">⌕</span><span>Search clients, sessions, notes...</span></Link>
          <div className="top-actions"><NotificationBell /><div className="top-user"><div className="avatar">{getInitials(therapist?.name, 'T')}</div><div><b>{therapist?.name || 'Therapist'}</b><span>Therapist</span></div></div></div>
          </header>
        <div className="content-wrap">
          {(title || action) && <div className="content-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
          {children}
        </div>
      </main>
    </div>
  );
}