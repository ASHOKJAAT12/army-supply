const express = require('express');
const {
    createItem,
    getItems,
    getItem,
    updateItem,
    deleteItem,
} = require('../controllers/itemController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getItems)
    .post(authorize('admin', 'operator'), createItem);

router
    .route('/:id')
    .get(getItem)
    .put(authorize('admin', 'operator'), updateItem)
    .delete(authorize('admin'), deleteItem);

module.exports = router;
