const express = require('express');
const {
    createInventory,
    getInventories,
    getInventory,
    updateInventory,
    deleteInventory,
    getCriticalInventory,
    getInventorySummary
} = require('../controllers/inventoryController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Specific endpoints before /:id routes
router.get('/critical', getCriticalInventory);
router.get('/summary', getInventorySummary);

router
    .route('/')
    .get(getInventories)
    .post(authorize('admin', 'operator'), createInventory);

router
    .route('/:id')
    .get(getInventory)
    .put(authorize('admin', 'operator'), updateInventory)
    .delete(authorize('admin'), deleteInventory);

module.exports = router;
