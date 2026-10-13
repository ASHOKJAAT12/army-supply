class AuditLogService {
    async createLog(userId, action, entity, entityId, oldValue, newValue, reason, sourceDecisionId) {
        try {
            const AuditLog = require('../models/AuditLog');
            const log = new AuditLog({
                user: userId,
                action,
                entity,
                entityId,
                oldValue,
                newValue,
                reason,
                sourceDecisionId
            });
            await log.save();
            return { success: true, data: log };
        } catch (e) {
            console.error('[AUDIT]', e);
            return { success: false };
        }
    }
}
module.exports = new AuditLogService();
