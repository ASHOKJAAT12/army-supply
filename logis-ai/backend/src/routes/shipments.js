const express = require('express');
const {
    createShipment,
    getShipments,
    getShipment,
    updateShipment,
    deleteShipment,
    markReady,
    dispatchShipment,
    deliverShipment,
    cancelShipment
} = require('../controllers/shipmentController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.patch('/:id/ready', authorize('admin', 'operator'), markReady);
router.patch('/:id/dispatch', authorize('admin', 'operator'), dispatchShipment);
router.patch('/:id/deliver', authorize('admin', 'operator'), deliverShipment);
router.patch('/:id/cancel', authorize('admin', 'operator'), cancelShipment);

router
    .route('/')
    .get(getShipments)
    .post(authorize('admin', 'operator'), createShipment);

router
    .route('/:id')
    .get(getShipment)
    .put(authorize('admin', 'operator'), updateShipment)
    .delete(authorize('admin'), deleteShipment);

module.exports = router;
