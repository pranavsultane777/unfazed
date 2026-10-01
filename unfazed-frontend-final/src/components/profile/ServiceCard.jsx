import { formatCurrency } from '../../utils/formatters'

export default function ServiceCard({ therapist }) {
  const price = Number(therapist?.sessionPrice || 0);
  return (
    <div className="service selected">
      <b>Individual Therapy Session</b>
      <span>Single consultation booked directly into therapist's live calendar</span>
      <strong>{price > 0 ? formatCurrency(price) : 'Fee not configured'}</strong>
    </div>
  );
}