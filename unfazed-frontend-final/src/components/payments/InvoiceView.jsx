export default function InvoiceView({ invoiceNumber }) {
  if (!invoiceNumber) return null;
  return <p>Invoice generated: <b>{invoiceNumber}</b></p>;
}
