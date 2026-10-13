const express = require('express');
const { trainModel, getForecast, getForecastSummary, batchForecast } = require('../controllers/forecastController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Restricted to ops / admin
router.post('/train', authorize('admin', 'operator'), trainModel);
router.post('/batch', authorize('admin', 'operator'), batchForecast);

// Viewers can view
router.get('/summary', getForecastSummary);
router.get('/:locationId/:itemId', getForecast);

module.exports = router;
