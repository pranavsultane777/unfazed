const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const clientAuthRoutes = require('./routes/clientAuthRoutes');
const clientPortalRoutes = require('./routes/clientPortalRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const schedulingRoutes = require('./routes/schedulingRoutes');
const clientRoutes = require('./routes/clientRoutes');
const noteRoutes = require('./routes/noteRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const entitlementRoutes = require('./routes/entitlementRoutes');
const leadRoutes = require('./routes/leadRoutes');
const therapistPackageRoutes = require('./routes/therapistPackageRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
const allowedOrigins = String(process.env.CORS_ORIGIN || '*').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('CORS origin not allowed'));
} }));

// Razorpay webhook needs the raw request body to verify the signature,
// so this must be registered BEFORE express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/client-auth', clientAuthRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/entitlements', entitlementRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/therapist/packages', therapistPackageRoutes);

// Health-check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Unfazed API is running', timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;