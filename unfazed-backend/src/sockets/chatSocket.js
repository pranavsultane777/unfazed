const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Therapist = require('../models/Therapist');
const Client = require('../models/Client');

const parseRoom = (roomId) => {
  if (typeof roomId !== 'string') return null;
  const ids = roomId.split('-');
  if (ids.length !== 2 || !ids.every((id) => mongoose.isValidObjectId(id))) return null;
  return ids;
};

const authenticateSocket = async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) throw new Error('Authentication required');

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const role = decoded.role === 'client' ? 'client' : 'therapist';
  const Model = role === 'client' ? Client : Therapist;
  const user = await Model.findById(decoded.id).select('_id therapist');
  if (!user) throw new Error('User not found');

  return { id: String(user._id), role, user };
};

// A valid conversation is always <therapistId>-<clientId>, sorted for stability.
// The authenticated user must be one of those participants and the client must
// actually belong to the therapist. This prevents arbitrary room access/spoofing.
const authorizeRoom = async (identity, roomId) => {
  const ids = parseRoom(roomId);
  if (!ids || !ids.includes(identity.id)) return false;

  const therapistId = identity.role === 'therapist'
    ? identity.id
    : ids.find((id) => id !== identity.id);
  const clientId = identity.role === 'client'
    ? identity.id
    : ids.find((id) => id !== identity.id);

  if (!therapistId || !clientId) return false;
  const client = await Client.findOne({ _id: clientId, therapist: therapistId }).select('_id therapist');
  return Boolean(client);
};

const initChatSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateSocket(socket);
      next();
    } catch (error) {
      next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Authenticated socket connected: ${socket.user.role} ${socket.user.id}`);
    socket.join(`user:${socket.user.role}:${socket.user.id}`);

    socket.on('join-room', async (roomId, callback) => {
      try {
        if (!(await authorizeRoom(socket.user, roomId))) {
          if (typeof callback === 'function') callback({ ok: false, message: 'Not authorized for this conversation' });
          return;
        }
        socket.join(roomId);
        if (typeof callback === 'function') callback({ ok: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ ok: false, message: 'Could not join conversation' });
      }
    });

    socket.on('send-message', async (data, callback) => {
      const { roomId, text } = data || {};
      const cleanText = String(text || '').trim();
      try {
        if (!cleanText || cleanText.length > 4000) throw new Error('Message must be between 1 and 4000 characters');
        if (!(await authorizeRoom(socket.user, roomId))) throw new Error('Not authorized for this conversation');

        const ids = parseRoom(roomId);
        const receiverId = ids.find((id) => id !== socket.user.id);
        const receiverRole = socket.user.role === 'therapist' ? 'client' : 'therapist';

        const savedMessage = await Message.create({
          roomId,
          senderId: socket.user.id,
          senderRole: socket.user.role,
          text: cleanText,
        });

        io.to(roomId).emit('receive-message', savedMessage);

        const notification = await Notification.create({
          recipientId: receiverId,
          recipientRole: receiverRole,
          type: 'new-message',
          message: `New message: "${cleanText.slice(0, 40)}${cleanText.length > 40 ? '...' : ''}"`,
          link: receiverRole === 'therapist' ? '/dashboard/messages' : '/client/portal',
        });

        io.to(`user:${receiverRole}:${receiverId}`).emit('new-notification', notification);
        if (typeof callback === 'function') callback({ ok: true, message: savedMessage });
      } catch (error) {
        if (typeof callback === 'function') callback({ ok: false, message: error.message });
        else console.error('Error sending chat message:', error.message);
      }
    });

    socket.on('typing', async (roomId) => {
      try {
        if (await authorizeRoom(socket.user, roomId)) socket.to(roomId).emit('user-typing');
      } catch (error) {
        // Ignore malformed/unauthorized typing events.
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.role} ${socket.user.id}`);
    });
  });
};

module.exports = initChatSocket;
