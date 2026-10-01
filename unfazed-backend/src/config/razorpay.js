const Razorpay = require('razorpay');

// Razorpay's SDK throws synchronously if key_id/key_secret are missing or
// empty - since this file is required at server startup (via
// paymentController -> app.js), that crash used to take down the ENTIRE
// backend before it could even start, even for people who just hadn't
// filled in their .env yet. Instead: warn clearly, and only actually throw
// when a payment route is hit (not at import time).
let razorpayInstance = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn(
    '[unfazed] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in .env - ' +
      'payment routes will fail until these are set. Server will keep running ' +
      'so the rest of the app (auth, scheduling, notes, chat, etc.) still works.'
  );

  razorpayInstance = new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in unfazed-backend/.env'
        );
      },
    }
  );
}

module.exports = razorpayInstance;