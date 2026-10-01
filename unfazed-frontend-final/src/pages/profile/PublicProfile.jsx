import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import ProfileHero from '../../components/profile/ProfileHero';
import About from '../../components/profile/About';
import ServiceCard from '../../components/profile/ServiceCard';

export default function PublicProfile() {
  const { slug } = useParams();
  const [therapist, setTherapist] = useState(null);
  const [error, setError] = useState('');
  const [inquiry, setInquiry] = useState({ name: '', email: '', phone: '', message: '' });
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryError, setInquiryError] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  useEffect(() => {
    let mounted = true;
    axiosInstance.get(`/therapist/profile/${slug}`)
      .then((r) => {
        if (mounted) setTherapist(r.data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || 'Therapist profile not found');
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!therapist) return undefined;

    const description = therapist.bio?.trim() || `Book a therapy session with ${therapist.name} on Unfazed.`;
    const url = window.location.href;
    const previousTitle = document.title;
    document.title = `${therapist.name} | Unfazed`;

    const tags = [
      { attr: 'name', key: 'description', content: description },
      { attr: 'property', key: 'og:title', content: `${therapist.name} | Unfazed` },
      { attr: 'property', key: 'og:description', content: description },
      { attr: 'property', key: 'og:url', content: url },
      { attr: 'property', key: 'og:type', content: 'profile' },
      { attr: 'property', key: 'og:site_name', content: 'Unfazed' },
      { attr: 'name', key: 'twitter:card', content: 'summary' },
      { attr: 'name', key: 'twitter:title', content: `${therapist.name} | Unfazed` },
      { attr: 'name', key: 'twitter:description', content: description },
    ];

    const previous = [];
    const created = [];
    tags.forEach(({ attr, key, content }) => {
      const selector = `meta[${attr}="${key}"]`;
      let meta = document.head.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, key);
        document.head.appendChild(meta);
        created.push(meta);
      } else {
        previous.push({ meta, content: meta.getAttribute('content') });
      }
      meta.setAttribute('content', content);
    });

    return () => {
      document.title = previousTitle;
      previous.forEach(({ meta, content }) => {
        if (content === null) meta.removeAttribute('content');
        else meta.setAttribute('content', content);
      });
      created.forEach((meta) => meta.remove());
    };
  }, [therapist]);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquiryError('');
    setSendingInquiry(true);
    try {
      await axiosInstance.post(`/leads/${slug}`, {
        name: inquiry.name.trim(),
        email: inquiry.email.trim(),
        phone: inquiry.phone.trim(),
        message: inquiry.message.trim(),
      });
      setInquirySent(true);
      setInquiry({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      setInquiryError(err.response?.data?.message || 'Could not send inquiry. Please try again.');
    } finally {
      setSendingInquiry(false);
    }
  };

  if (error) {
    return (
      <main className="portal-page">
        <nav className="portal-nav">
          <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
          <Link to="/" className="btn btn-outline btn-sm">Home</Link>
        </nav>
        <div className="not-found-page">
          <h2>Therapist Profile Not Found</h2>
          <p>{error}</p>
          <Link to="/" className="btn btn-blue">Explore Unfazed</Link>
        </div>
      </main>
    );
  }

  if (!therapist) {
    return (
      <main className="portal-page">
        <nav className="portal-nav">
          <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
        </nav>
        <div className="loading-page">Loading therapist profile…</div>
      </main>
    );
  }

  return (
    <main className="portal-page">
      <nav className="portal-nav">
        <Link to="/" className="brand-new"><span className="brand-icon">♢</span>Unfazed</Link>
        <div>
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#inquiry">Contact</a>
        </div>
        <Link to={`/${therapist.slug}/book`} className="btn btn-blue">Book a Session</Link>
      </nav>

      <ProfileHero therapist={therapist} />

      <section className="portal-content">
        <div>
          <About therapist={therapist} />

          {/* Inbound Visitor Inquiry Form */}
          <div id="inquiry" className="lead-inquiry-card">
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Have a question? Send an Inquiry</h3>
            <p className="muted" style={{ margin: '0 0 16px' }}>
              Send a direct private message to {therapist.name} before booking.
            </p>
            {inquirySent ? (
              <div className="success-msg" role="status">
                Your message has been sent to {therapist.name}. They will reach out to you via email soon.
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} style={{ display: 'grid', gap: 10 }}>
                <input
                  className="inner-search"
                  placeholder="Your Name *"
                  value={inquiry.name}
                  onChange={(e) => setInquiry({ ...inquiry, name: e.target.value })}
                  required
                />
                <input
                  className="inner-search"
                  type="email"
                  placeholder="Your Email Address *"
                  value={inquiry.email}
                  onChange={(e) => setInquiry({ ...inquiry, email: e.target.value })}
                  required
                />
                <input
                  className="inner-search"
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={inquiry.phone}
                  onChange={(e) => setInquiry({ ...inquiry, phone: e.target.value })}
                />
                <textarea
                  className="inner-search"
                  rows={3}
                  placeholder="Your Question or Inquiry Message *"
                  value={inquiry.message}
                  onChange={(e) => setInquiry({ ...inquiry, message: e.target.value })}
                  required
                />
                {inquiryError && <div className="error-msg" role="alert">{inquiryError}</div>}
                <button className="btn btn-outline" type="submit" disabled={sendingInquiry}>
                  {sendingInquiry ? 'Sending…' : 'Send Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div id="services" className="booking-card">
          <div className="stepper">
            <span className="active">1</span><span>Choose Service</span><i>—</i>
            <span>2</span><span>Select Date & Time</span><i>—</i>
            <span>3</span><span>Payment</span><i>—</i>
            <span>4</span><span>Confirmation</span>
          </div>
          <h2>Book a Session</h2>
          <div className="service-grid">
            <ServiceCard therapist={therapist} />
          </div>
          {Number(therapist.sessionPrice || 0) > 0 ? (
            <Link to={`/${therapist.slug}/book`} className="btn btn-blue full">
              Continue to Booking Calendar →
            </Link>
          ) : (
            <p style={{ color: '#c0392b', fontSize: 13 }}>The therapist has not configured a session fee yet.</p>
          )}
          <Link to={`/${therapist.slug}/payment`} className="btn btn-outline full" style={{ marginTop: 10 }}>
            View Session Packages & Passes
          </Link>
          <p id="faq" style={{ fontSize: 12, color: '#64748b', marginTop: 14 }}>
            Appointment slots are selected live and confirmed via Razorpay test payment. Intake and digital consent are collected seamlessly.
          </p>
        </div>
      </section>
    </main>
  );
}
