const Notification = require('../models/Notification');

class NotificationService {
    async createNotification(type, message, priority = 'medium', entityType, entityId, dedupeKey) {
        try {
            // Deduplication logic
            if (dedupeKey) {
                const existing = await Notification.findOne({
                    deduplicationKey: dedupeKey,
                    read: false
                });

                if (existing) {
                    // Update timestamp on existing rather than spamming
                    existing.updatedAt = new Date();
                    await existing.save();
                    return { success: true, data: existing, dup: true };
                }
            }

            const notif = new Notification({
                type,
                message,
                priority,
                entityType,
                entityId,
                deduplicationKey: dedupeKey
            });

            await notif.save();

            // Note: the socket layer (in app.js/socket/etc) can hook here to broadcast 
            // if we wanted instant toast alerts globally. For now, we will poll or emit via global object.

            return { success: true, data: notif };
        } catch (e) {
            console.error('Failed to create notification', e);
            return { success: false };
        }
    }

    async getActiveNotifications() {
        try {
            const list = await Notification.find({ read: false }).sort({ createdAt: -1 }).limit(50);
            return { success: true, data: list };
        } catch (e) {
            console.error('Failed to fetch logic', e);
            return { success: false, data: [] };
        }
    }

    async markRead(id) {
        try {
            const notif = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
            return { success: true, data: notif };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }
}

module.exports = new NotificationService();
