export default function CheckoutForm({ clientInfo, setClientInfo }) {
  return <div style={{ display: 'grid', gap: 10 }}><input placeholder="Your name" value={clientInfo.name} onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })} required /><input type="email" placeholder="Your email" value={clientInfo.email} onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })} required /><input type="tel" placeholder="Phone (optional)" value={clientInfo.phone} onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })} /></div>;
}
