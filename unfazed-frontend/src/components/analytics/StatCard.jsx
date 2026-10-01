export default function StatCard({ icon, value, label, tone = 'blue' }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>;
}
