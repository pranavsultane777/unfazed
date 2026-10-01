require('dotenv').config();
const mongoose = require('mongoose');
const { ensureDefaultTiers } = require('../src/services/entitlementService');
const connectDB = require('../src/config/db');

(async () => {
  try {
    await connectDB();
    await ensureDefaultTiers();
    console.log('Subscription tiers seeded successfully.');
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
