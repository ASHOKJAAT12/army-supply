const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimizationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Viewers can view history
router.get('/', protect, optimizationController.getOptimizationHistory);
router.get('/:id', protect, optimizationController.getOptimizationRun);

// Operators/Admins can run or apply
router.post('/run', protect, authorize('operator', 'admin'), optimizationController.runOptimization);
router.post('/:id/apply', protect, authorize('operator', 'admin'), optimizationController.applyOptimization);

module.exports = router;
