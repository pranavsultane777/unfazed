# Unfazed — Major Project Web Development

MERN SaaS platform for therapists in India, following the supplied Unlox Major Project PDF.

## Structure

```text
unfazed/
├── unfazed-backend/
├── unfazed-frontend/
├── render.yaml
└── PDF-COMPLIANCE-CHECKLIST.md
```

## Local setup

### Backend

```bash
cd unfazed-backend
npm install
# copy .env.example to .env and fill MongoDB/Razorpay/JWT values
npm run seed:tiers
npm run seed:demo   # optional; set SEED_THERAPIST_PASSWORD first
npm run dev
```

Backend health check: `http://localhost:5000/api/health`

### Frontend

```bash
cd unfazed-frontend
npm install
# copy .env.example to .env
npm run dev
```

Frontend: `http://localhost:5173`

## Implemented modules

1. Auth, therapist profile and branded link
2. Scheduling and timezone-aware booking
3. Client CRM, intake and digital consent
4. Razorpay payments, packages and invoices
5. Private/shared clinical notes with freeform/SOAP/DAP formats
6. Authenticated Socket.io chat and automated notifications
7. Centralized subscription entitlements and MongoDB analytics

## Deployment

- `unfazed-frontend/vercel.json` contains the SPA rewrite required for Vercel routing.
- `render.yaml` contains a Render backend service definition and required environment variables.
- Configure secrets in the deployment provider; never commit `.env` files.

See `PDF-COMPLIANCE-CHECKLIST.md` for the requirement-by-requirement status.
