import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';

// Frontend mirror of the backend's entitlementService: fetches the
// therapist's current tier once, then lets any component ask "can I use
// this feature" without re-checking a subscription-tier string itself.
// The backend is still the source of truth — this only avoids showing UI
// for actions that would be rejected anyway.
export default function useEntitlement() {
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    return axiosInstance
      .get('/entitlements/me')
      .then((r) => setTier(r.data))
      .catch(() => setTier(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const canUse = useCallback(
    (featureKey) => Boolean(tier?.features?.[featureKey]),
    [tier]
  );

  const capFor = useCallback((capKey) => tier?.caps?.[capKey], [tier]);
  const isCurrentPlan = useCallback(
    (planKey) => Boolean(planKey && tier?.tier?.key === planKey),
    [tier]
  );

  return { tier, loading, canUse, capFor, isCurrentPlan, refresh };
}
