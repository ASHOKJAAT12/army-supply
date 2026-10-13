const express = require('express');
const { calculateRoute } = require('../controllers/routeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Operators/Admins can calculate routes for planning
router.post('/calculate', authorize('admin', 'operator'), calculateRoute);

module.exports = router;
