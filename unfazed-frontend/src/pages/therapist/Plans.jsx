import { useEffect, useState } from 'react';
import AppShell from '../../components/common/AppShell';
import axiosInstance from '../../api/axiosInstance';
import useEntitlement from '../../hooks/useEntitlement';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const { isCurrentPlan } = useEntitlement();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    axiosInstance.get('/entitlements/tiers')
      .then((r) => mounted && setPlans(Array.isArray(r.data) ? r.data : []))
      .catch((err) => mounted && setError(err.response?.data?.message || 'Could not load subscription plans.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <AppShell title="Plans & Entitlements" subtitle="Feature access is driven by the SubscriptionTierConfig collection.">
      {loading && <div className="loading-state">Loading plans…</div>}
      {error && <div className="error-msg" role="alert">{error}</div>}
      {!loading && !error && plans.length === 0 && <div className="empty-state">No subscription plans are available right now.</div>}
      <div className="feature-grid">
        {plans.map((plan) => (
          <section className="panel" key={plan.key} style={{ padding: 22 }}>
            <h3>{plan.name}</h3>
            <p style={{ fontSize: 22, fontWeight: 700 }}>₹{Number(plan.monthlyPrice || 0).toLocaleString('en-IN')}<small>/month</small></p>
            {isCurrentPlan(plan.key) && <span className="tag">Current plan</span>}
            <ul style={{ lineHeight: 1.9, paddingLeft: 20 }}>
              <li>{plan.caps?.activeClients} active clients</li>
              <li>{plan.caps?.analyticsMonths} month analytics history</li>
              <li>{plan.features?.advancedAnalytics ? 'Advanced analytics' : 'Basic analytics'}</li>
              <li>{plan.features?.noteTemplates ? 'SOAP/DAP note templates' : 'Freeform notes'}</li>
              <li>{plan.features?.packages ? 'Session packages' : 'No packages'}</li>
            </ul>
          </section>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 16 }}>Plan changes are intentionally not simulated in the demo. An administrator/subscription workflow can update the therapist's configured tier in MongoDB.</p>
    </AppShell>
  );
}
