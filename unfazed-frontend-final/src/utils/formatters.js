export function getInitials(name = '', fallback = 'U') {
  if (!name || typeof name !== 'string') return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatCurrency(amount = 0) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
}

export function calculateDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}
