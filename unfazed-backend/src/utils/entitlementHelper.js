const ClientPackage = require('../models/ClientPackage');

// Check if client has a usable (active, not expired, has balance) package
// Returns the ClientPackage document if usable, otherwise null
const findUsablePackage = async (clientId) => {
  const now = new Date();

  // Find an active package for this client that hasn't expired
  const clientPackage = await ClientPackage.findOne({
    client: clientId,
    status: 'active',
    expiryDate: { $gte: now },
  }).sort({ purchaseDate: 1 }); // use the OLDEST active package first (FIFO)

  if (!clientPackage) return null;

  // Check if it still has sessions remaining
  if (clientPackage.sessionsUsed >= clientPackage.sessionsTotal) {
    return null;
  }

  return clientPackage;
};

// Deduct one session from a client's package (call this when a session is booked/completed)
const consumeSession = async (clientPackageId) => {
  const clientPackage = await ClientPackage.findById(clientPackageId);
  if (!clientPackage) throw new Error('Client package not found');

  clientPackage.sessionsUsed += 1;

  // If this was the last session, mark package as completed
  if (clientPackage.sessionsUsed >= clientPackage.sessionsTotal) {
    clientPackage.status = 'completed';
  }

  await clientPackage.save();
  return clientPackage;
};

module.exports = { findUsablePackage, consumeSession };