const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getScorecard } = require('../services/systemService'); // Use system logic for overall checks!

// Standard liveness probe
router.get('/', (req, res) => {
    const mongoState = mongoose.connection.readyState;
    let status = 'connected';
    if (mongoState !== 1) status = 'disconnected';

    res.status(mongoState === 1 ? 200 : 503).json({
        success: true,
        message: 'LOGIS-AI Backend System Health',
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            status: mongoState === 1 ? 'healthy' : 'degraded',
            database: status,
            requestId: req.requestId
        }
    });
});

// App Versioning API
router.get('/version', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'demo',
            build: process.env.VITE_APP_ENV || 'production'
        }
    });
});

module.exports = router;
