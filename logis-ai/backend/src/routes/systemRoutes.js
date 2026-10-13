const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const systemService = require('../services/systemService');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/notifications', async (req, res) => {
    const result = await notificationService.getActiveNotifications();
    res.json(result);
});

router.patch('/notifications/:id/read', async (req, res) => {
    const result = await notificationService.markRead(req.params.id);
    res.json(result);
});

router.get('/system/scorecard', async (req, res) => {
    const result = await systemService.getScorecard();
    res.json(result);
});

module.exports = router;
