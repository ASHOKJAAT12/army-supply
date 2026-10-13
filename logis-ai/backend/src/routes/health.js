const express = require('express');
const router = express.Router();

// @route GET /api/health
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'LOGIS-AI backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

module.exports = router;
