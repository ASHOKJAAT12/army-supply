const express = require('express');
const router = express.Router();
const decisionService = require('../services/decisionService');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/active', async (req, res) => {
    const result = await decisionService.getActiveDecisions();
    if (result.success) return res.status(200).json(result);
    res.status(500).json(result);
});

router.post('/generate', async (req, res) => {
    // Allows manual generation of an optimization review for a specfic location
    const { locationId } = req.body;
    if (!locationId) return res.status(400).json({ success: false, message: 'locationId required' });
    const result = await decisionService.generateDecision({ locationId, automated: false });
    if (result.success) return res.status(200).json(result);
    res.status(500).json(result);
});

router.post('/simulate', async (req, res) => {
    const { decisionId, customParams } = req.body;
    const result = await decisionService.simulateOption({ decisionId, customParams });
    if (result.success) return res.status(200).json(result);
    res.status(400).json(result);
});

router.get('/:id', async (req, res) => {
    const result = await decisionService.getDecision(req.params.id);
    if (result.success) return res.status(200).json(result);
    res.status(404).json(result);
});

router.post('/:id/approve', async (req, res) => {
    const result = await decisionService.approveDecision(req.params.id, req.user);
    if (result.success) return res.status(200).json(result);
    res.status(400).json(result);
});

router.post('/:id/reject', async (req, res) => {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required for rejection' });
    const result = await decisionService.rejectDecision(req.params.id, req.user, reason);
    if (result.success) return res.status(200).json(result);
    res.status(400).json(result);
});

router.post('/:id/apply', async (req, res) => {
    const result = await decisionService.applyDecision(req.params.id, req.user);
    if (result.success) return res.status(200).json(result);
    res.status(400).json(result);
});

module.exports = router;
