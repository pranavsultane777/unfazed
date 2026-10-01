import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const FEATURE_LABELS = {
  activeClientCap: 'Active client limit',
  noteTemplates: 'Structured note templates',
  advancedAnalytics: 'Extended analytics history',
  packages: 'Session packages',
};

// Mounted once near the app root. Listens for the 'feature-locked' event
// axiosInstance broadcasts whenever the backend rejects a request with
// FEATURE_LOCKED, so the upgrade prompt actually appears at the moment a
// blocked action is attempted — not as a static sidebar card.
export default function UpgradeModal() {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const handler = (e) => setDetail(e.detail);
    window.addEventListener('feature-locked', handler);
    return () => window.removeEventListener('feature-locked', handler);
  }, []);

  if (!detail) return null;

  const label = FEATURE_LABELS[detail.feature] || 'This feature';

  return (
    <div className="upgrade-overlay" onClick={() => setDetail(null)}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-modal-icon">✦</div>
        <h3>{label} is locked</h3>
        <p>{detail.message || 'This feature is not included in your current plan.'}</p>
        {detail.tier && <span className="tag">Current plan: {detail.tier}</span>}
        <div className="upgrade-modal-actions">
          <button className="btn btn-outline" onClick={() => setDetail(null)}>Not now</button>
          <Link to="/dashboard/plans" className="btn btn-blue" onClick={() => setDetail(null)}>View plans →</Link>
        </div>
      </div>
    </div>
  );
}
