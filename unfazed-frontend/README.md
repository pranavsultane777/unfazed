# Unfazed Frontend Final

Cleaned and rebuilt React/Vite frontend for the Unfazed therapist SaaS project.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to the backend API URL.
3. Set `VITE_RAZORPAY_KEY_ID` to the public Razorpay key used by the deployment.
4. Run `npm install`.
5. Run `npm run dev` for development or `npm run build` for production.

## Included modules

- Therapist authentication and protected dashboard
- Therapist profile and branded public profile
- Scheduling and availability
- Client CRM and intake
- Clinical notes with private/shared presentation
- Payments, packages and invoice UI
- Real-time chat and notifications
- Subscription tiers and entitlements
- Analytics
- Client portal, booking and consent flow

## Backend dependency

This frontend intentionally does not modify backend code. API availability, authorization rules, Socket.IO server behavior, payment webhooks and server-side note authorization remain backend responsibilities.
