const express = require('express');
const {
    createVehicle,
    getVehicles,
    getVehicle,
    updateVehicle,
    deleteVehicle,
} = require('../controllers/vehicleController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getVehicles)
    .post(authorize('admin', 'operator'), createVehicle);

router
    .route('/:id')
    .get(getVehicle)
    .put(authorize('admin', 'operator'), updateVehicle)
    .delete(authorize('admin'), deleteVehicle);

module.exports = router;
