import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
export const markNotificationsRead = async (req, res, next) => {
  const { notificationId } = req.body;

  try {
    if (notificationId) {
      // Mark a single notification as read
      await Notification.findByIdAndUpdate(notificationId, { read: true });
    } else {
      // Mark all user notifications as read
      await Notification.updateMany({ recipient: req.user._id }, { read: true });
    }

    res.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
