const express = require('express');
const {
    createConsumption,
    getConsumptions,
    getConsumption,
    updateConsumption,
    deleteConsumption,
} = require('../controllers/consumptionController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getConsumptions)
    .post(authorize('admin', 'operator'), createConsumption);

router
    .route('/:id')
    .get(getConsumption)
    .put(authorize('admin', 'operator'), updateConsumption)
    .delete(authorize('admin'), deleteConsumption);

module.exports = router;
