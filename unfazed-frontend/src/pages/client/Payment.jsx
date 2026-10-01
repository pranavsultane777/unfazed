import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import CheckoutForm from '../../components/payments/CheckoutForm';
import InvoiceView from '../../components/payments/InvoiceView';
import { formatCurrency } from '../../utils/formatters';

const Payment = () => {
  const { slug } = useParams();
  const location = useLocation();
  const booking = location.state?.booking || null;
  const [packages, setPackages] = useState([]);
  const [therapist, setTherapist] = useState(null);
  const [clientInfo, setClientInfo] = useState(location.state?.clientInfo || { name: '', email: '', phone: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paidEmail, setPaidEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [profileResponse, packageResponse] = await Promise.all([
          axiosInstance.get(`/therapist/profile/${slug}`),
          axiosInstance.get(`/payments/packages/${slug}`),
        ]);
        if (!mounted) return;
        setTherapist(profileResponse.data);
        setPackages(Array.isArray(packageResponse.data) ? packageResponse.data : []);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Could not load payment and booking details');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const handlePayment = async (packageId = null) => {
    setError('');
    setMessage('');
    setProcessing(true);

    if (!clientInfo.name.trim() || !clientInfo.email.trim()) {
      setError('Please provide your name and email address before proceeding to payment.');
      setProcessing(false);
      return;
    }
    if (!packageId && !booking) {
      setError('Select an appointment from the booking calendar first.');
      setProcessing(false);
      return;
    }

    try {
      const orderResponse = await axiosInstance.post('/payments/create-order', {
        slug,
        name: clientInfo.name.trim(),
        email: clientInfo.email.trim().toLowerCase(),
        phone: clientInfo.phone.trim(),
        packageId: packageId || undefined,
        booking: packageId ? undefined : booking,
      });

      const { orderId, amount, currency, paymentId, razorpayKeyId } = orderResponse.data;
      if (!window.Razorpay) {
        throw new Error('Razorpay secure checkout did not load. Please check your internet connection or ad-blocker and refresh the page.');
      }

      const options = {
        key: razorpayKeyId,
        amount,
        currency,
        name: therapist?.name || 'Unfazed Therapist',
        description: packageId ? 'Therapy Session Package' : 'Therapy Session Booking',
        order_id: orderId,
        prefill: {
          name: clientInfo.name,
          email: clientInfo.email,
          contact: clientInfo.phone,
        },
        notes: booking ? { appointment: booking.display } : undefined,
        handler: async (response) => {
          try {
            const verified = await axiosInstance.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId,
            });
            setMessage(
              packageId
                ? 'Package purchased successfully! Your session balance is now available in your client portal.'
                : 'Payment successful! Your therapy appointment is confirmed.'
            );
            setCompleted(true);
            setPaidEmail(clientInfo.email);
            setInvoiceNumber(verified.data?.invoiceNumber || '');
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed. Please contact your therapist.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
        theme: { color: '#146df5' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment was unsuccessful or cancelled. Please try again.');
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not initiate secure checkout.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-page">
        <header className="portal-nav">
          <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
          <Link to={`/${slug}`} className="btn btn-outline btn-sm">← Back to Profile</Link>
        </header>
        <div className="loading-page">Loading secure checkout…</div>
      </div>
    );
  }

  const sessionFee = Number(therapist?.sessionPrice || 0);

  return (
    <div className="portal-page">
      <header className="portal-nav">
        <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to={`/${slug}/book`} className="btn btn-outline btn-sm">← Change Slot</Link>
          <Link to={`/${slug}`} className="btn btn-outline btn-sm">Therapist Profile</Link>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: '30px auto', padding: '0 20px 60px' }}>
        <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>
          {booking ? 'Confirm & Pay for Appointment' : 'Session Packages & Checkout'}
        </h1>
        {therapist && (
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>
            Therapist: <b>{therapist.name}</b>
          </p>
        )}

        {/* Selected Appointment Details */}
        {booking && (
          <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Appointment Details</h3>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{booking.display}</div>
            <div style={{ marginTop: 8, fontSize: 15, color: '#146df5', fontWeight: 700 }}>
              Session Fee: {formatCurrency(sessionFee)}
            </div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Your appointment is guaranteed and booked only after payment is finalized via Razorpay.
            </p>
          </section>
        )}

        {/* Client details */}
        {!completed && (
          <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Client Details for Invoice & Receipt</h3>
            <CheckoutForm clientInfo={clientInfo} setClientInfo={setClientInfo} />
          </section>
        )}

        {/* Single Session Checkout */}
        {booking && !completed && (
          <button
            type="button"
            className="btn btn-blue full btn-large"
            disabled={processing}
            onClick={() => handlePayment()}
          >
            {processing ? 'Connecting to Razorpay…' : `Pay ${formatCurrency(sessionFee)} & Confirm Booking`}
          </button>
        )}

        {/* Session Packages */}
        {!booking && !completed && (
          <section className="panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Available Session Packages</h3>
            {packages.length === 0 ? (
              <div className="empty-state">No packages are currently configured for this therapist.</div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {packages.map((pkg) => (
                  <div
                    key={pkg._id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 18,
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{pkg.name}</h4>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {pkg.numberOfSessions} sessions · {formatCurrency(pkg.pricePerSession)} / session · valid {pkg.validityDays} days
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        Total: {formatCurrency(pkg.totalPrice)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-blue"
                      disabled={processing}
                      onClick={() => handlePayment(pkg._id)}
                    >
                      {processing ? 'Processing…' : `Buy Package (${formatCurrency(pkg.totalPrice)})`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Completion Confirmation */}
        {completed && (
          <section className="panel" style={{ padding: 28, textAlign: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Payment Completed Successfully</h2>
            <p style={{ color: '#16a34a', margin: '0 0 16px', fontSize: 14 }}>{message}</p>
            <InvoiceView invoiceNumber={invoiceNumber} />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <Link
                to={`/client/set-password?email=${encodeURIComponent(paidEmail)}`}
                className="btn btn-blue"
              >
                Set up Client Password
              </Link>
              <Link to="/client/login" className="btn btn-outline">
                Client Portal Login
              </Link>
              <Link to={`/${slug}`} className="btn btn-outline">
                Back to Profile
              </Link>
            </div>
          </section>
        )}

        {error && <div className="error-msg" role="alert" style={{ marginTop: 20 }}>{error}</div>}
      </main>
    </div>
  );
};

export default Payment;
