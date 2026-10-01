const Notification = require('../models/Notification');

// @desc    Get all notifications for logged-in user (therapist OR client)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const recipientId = req.therapist?._id || req.client?._id;

    const notifications = await Notification.find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipientId,
      isRead: false,
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.therapist?._id || req.client?._id;

    // Scope the update to recipientId too, so a logged-in user can only
    // ever mark THEIR OWN notifications as read, never someone else's by
    // guessing/passing another notification's id.
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Mark ALL notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const recipientId = req.therapist?._id || req.client?._id;

    await Notification.updateMany(
      { recipientId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
