const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Viewers can view anomalies
router.get('/', protect, anomalyController.getAnomalies);
router.get('/:locationId/:itemId', protect, anomalyController.getAnomalies); // Same logic for now

// Detect requires operator or admin
router.post('/detect', protect, authorize('operator', 'admin'), anomalyController.detectAnomalies);

module.exports = router;
