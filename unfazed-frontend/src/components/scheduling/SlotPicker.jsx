export default function SlotPicker({ slot, timezone }) {
  if (!slot) return null;
  return <div><b>{slot.date} · {slot.startTime} – {slot.endTime}</b><span style={{ display: 'block', color: '#666', fontSize: 13 }}>Timezone: {timezone}</span></div>;
}
