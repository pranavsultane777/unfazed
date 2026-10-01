# Unfazed Backend

Node.js/Express/MongoDB API for the Unfazed Major Project.

## Run

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` and configure MongoDB Atlas plus Razorpay test credentials.

Optional tier seed:

```bash
npm run seed:tiers
```

Optional local demo data seed (set `SEED_THERAPIST_PASSWORD` first):

```bash
npm run seed:demo
```

## Production checklist

- Set a strong `JWT_SECRET`.
- Use MongoDB Atlas or another production MongoDB deployment.
- Configure Razorpay test/live keys as appropriate.
- Configure `RAZORPAY_WEBHOOK_SECRET` and the public `/api/payments/webhook` endpoint.
- Set `CORS_ORIGIN` to the deployed frontend origin(s).
- Keep `invoices/` on persistent storage or move invoice/file storage behind the isolated storage service when deploying to ephemeral hosts.
- Keep the notification worker running continuously so 24-hour reminders and post-session follow-ups are processed.

## Core services

- JWT authentication for therapists and clients.
- Socket.io authenticated real-time chat with participant authorization.
- Razorpay order/signature/webhook verification and idempotent payment finalization.
- PDF invoice generation.
- Centralized subscription entitlement service.
- MongoDB aggregation analytics.
- Event-driven notification service with WhatsApp stub and scheduled sweep.
