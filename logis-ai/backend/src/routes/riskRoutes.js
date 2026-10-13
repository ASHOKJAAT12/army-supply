const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Viewers can read risks
router.get('/summary', protect, riskController.getRiskSummary);
router.get('/locations', protect, riskController.getRiskLocations);
router.get('/inventory', protect, riskController.getRiskLocations); // alias or specialized later
router.get('/shipments', protect, riskController.getRiskShipments);
router.get('/routes', protect, riskController.getRiskRoutes);
router.get('/:id', protect, riskController.getRiskById);

// Operators/Admins can calculate/recalculate
router.post('/calculate/location/:id', protect, authorize('operator', 'admin'), riskController.calculateLocationRisk);
router.post('/calculate/shipment/:id', protect, authorize('operator', 'admin'), riskController.calculateShipmentRisk);
router.post('/calculate/route', protect, authorize('operator', 'admin'), riskController.calculateRouteRisk);
router.post('/recalculate', protect, authorize('operator', 'admin'), riskController.recalculateAll);

module.exports = router;
