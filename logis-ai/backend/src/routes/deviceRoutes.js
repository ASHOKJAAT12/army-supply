const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

router.use(protect);

router.get('/', deviceController.getDevices);
router.get('/summary', deviceController.getDeviceSummary);
router.get('/:id', deviceController.getDeviceById);
router.get('/:id/telemetry', deviceController.getDeviceTelemetry);
router.post('/', authorize('admin'), deviceController.createDevice);

module.exports = router;
