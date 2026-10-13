const errorHandler = (err, req, res, next) => {

    // Default Status & Safe Message
    let statusCode = err.statusCode || 500;
    let message = 'Unable to process request';
    let errors = [];

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid Resource ID Format';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        errors = Object.values(err.errors).map(val => val.message);
    }

    // Capture standard structure in logs with trace ID
    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'backend-api',
        requestId: req.requestId,
        endpoint: req.originalUrl,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }));

    // Safe Response Format to Frontend
    res.status(statusCode).json({
        success: false,
        message: err.customMessage || message,
        errors: errors.length > 0 ? errors : [err.message],
        requestId: req.requestId,
        // Only return detailed stack traces in DEV mode
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
