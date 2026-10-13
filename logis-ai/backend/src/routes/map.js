const express = require('express');
const { getOverview } = require('../controllers/mapController');

// All authenticated roles generally can access the map
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/overview').get(getOverview);

module.exports = router;
