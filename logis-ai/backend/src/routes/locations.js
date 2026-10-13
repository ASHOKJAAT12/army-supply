const express = require('express');
const {
    createLocation,
    getLocations,
    getLocation,
    updateLocation,
    deleteLocation,
} = require('../controllers/locationController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router
    .route('/')
    .get(getLocations)
    .post(authorize('admin', 'operator'), createLocation);

router
    .route('/:id')
    .get(getLocation)
    .put(authorize('admin', 'operator'), updateLocation)
    .delete(authorize('admin'), deleteLocation); // Only admin can delete core data

module.exports = router;
