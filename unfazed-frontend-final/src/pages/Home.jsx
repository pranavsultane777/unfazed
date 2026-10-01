import { Link } from 'react-router-dom';

const Metric = ({ icon, title, text }) => (
  <div className="hero-metric">
    <span>{icon}</span>
    <div>
      <b>{title}</b>
      <small>{text}</small>
    </div>
  </div>
);

export default function Home() {
  return (
    <main className="landing-new">

      {/* ================= NAVBAR ================= */}
      <nav className="landing-nav-new">

        <Link to="/" className="brand-new">
          <span className="brand-icon">♢</span>
          Unfazed
        </Link>

        <div className="landing-links">
          <a href="#features">For Therapists</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#features">About</a>
        </div>

        <div className="nav-actions">
          <Link
            to="/login"
            className="btn btn-outline"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="btn btn-blue"
          >
            Get Started
          </Link>
        </div>

      </nav>


      {/* ================= HERO SECTION ================= */}
      <section className="hero-new">

        <div className="hero-new-copy">

          <span className="hero-pill">
            ◉ Built for Therapists in India
          </span>

          <h1>
            Your Practice.
            <br />
            <span>Simplified.</span>
          </h1>

          <p>
            Client acquisition, scheduling, payments, clinical
            notes and business analytics — all through one
            branded link.
          </p>

          <div className="hero-buttons">

            <Link
              to="/register"
              className="btn btn-blue btn-large"
            >
              Get Started
            </Link>

            <a
              href="#features"
              className="text-link"
            >
              See how it works →
            </a>

          </div>


          {/* HERO METRICS */}
          <div className="hero-metrics">

            <Metric
              icon="↗"
              title="Branded"
              text="Client Portal"
            />

            <Metric
              icon="▣"
              title="Secure"
              text="Payments"
            />

            <Metric
              icon="▤"
              title="Clinical"
              text="Notes"
            />

            <Metric
              icon="⌁"
              title="Business"
              text="Analytics"
            />

          </div>

        </div>


        {/* HERO VISUAL */}
        <div className="hero-visual">

          <div className="hero-photo">
            <div className="photo-placeholder">
              Dr.
            </div>
          </div>

          <div className="link-badge">
            ↗ &nbsp; unfazed.in/dr-sharma
          </div>

          <div className="manage-badge">

            <span>◴</span>

            <div>
              <b>Manage your practice</b>
              <small>
                end-to-end with Unfazed
              </small>
            </div>

          </div>

        </div>

      </section>


      {/* ================= FEATURES ================= */}
      <section
        id="features"
        className="feature-section"
      >

        <div>
          <span className="section-kicker">
            ONE WORKSPACE
          </span>

          <h2>
            Everything your practice needs.
          </h2>
        </div>


        <div className="feature-grid">

          {/* ================= SCHEDULING ================= */}
          <Link
            to="/dashboard/schedule"
            className="feature-card"
            aria-label="Open Scheduling"
          >

            <b>
              Scheduling
            </b>

            <span>
              Availability, booking and reminders.
            </span>

            <small>
              Open Scheduling →
            </small>

          </Link>


          {/* ================= CLINICAL NOTES ================= */}
          <Link
            to="/dashboard/notes"
            className="feature-card"
            aria-label="Open Clinical Notes"
          >

            <b>
              Clinical Notes
            </b>

            <span>
              Private and client-shared documentation.
            </span>

            <small>
              Open Clinical Notes →
            </small>

          </Link>


          {/* ================= PAYMENTS ================= */}
          <Link
            to="/dashboard/payments"
            className="feature-card"
            aria-label="Open Payments"
          >

            <b>
              Payments
            </b>

            <span>
              Razorpay, packages and invoices.
            </span>

            <small>
              Open Payments →
            </small>

          </Link>


          {/* ================= ANALYTICS ================= */}
          <Link
            to="/dashboard/analytics"
            className="feature-card"
            aria-label="Open Analytics"
          >

            <b>
              Analytics
            </b>

            <span>
              Revenue and practice insights.
            </span>

            <small>
              Open Analytics →
            </small>

          </Link>

        </div>

      </section>


      {/* ================= PRICING ANCHOR ================= */}
      <section
        id="pricing"
        className="pricing-anchor"
        aria-hidden="true"
      />

    </main>
  );
}