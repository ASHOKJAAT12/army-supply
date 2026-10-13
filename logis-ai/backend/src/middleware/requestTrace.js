const crypto = require('crypto');

const requestTrace = (req, res, next) => {
    // Generate a unique ID for every request to trace through the logs
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();

    // Pass it to the response headers for client tracking
    res.setHeader('X-Request-Id', req.requestId);

    // Simple structured request logging
    // Exclude noise like static assets or spammy endpoints
    const exclude = ['/api/system/scorecard'];
    if (!exclude.includes(req.path)) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'backend-api',
            requestId: req.requestId,
            method: req.method,
            endpoint: req.originalUrl,
            ip: req.ip
        }));
    }

    next();
};

module.exports = requestTrace;
