require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const mqttBroker = require('./services/mqttBroker');
const mqttService = require('./services/mqttService');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const requestTrace = require('./middleware/requestTrace');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const locationsRouter = require('./routes/locations');
const itemsRouter = require('./routes/items');
const inventoryRouter = require('./routes/inventory');
const consumptionRouter = require('./routes/consumption');
const vehiclesRouter = require('./routes/vehicles');
const shipmentRoutes = require('./routes/shipments');
const mapRoutes = require('./routes/map');
const routeRoutes = require('./routes/routes');
const forecastRoutes = require('./routes/forecasts');
const riskRoutes = require('./routes/riskRoutes');
const optimizationRoutes = require('./routes/optimizationRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const decisionRoutes = require('./routes/decisionRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// App configuration to pass io to routers if needed
app.set('io', io);

// Connect to MongoDB
connectDB();

// ─── Security & Reliability Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(requestTrace);

app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    })
);

// Rate Limiting (Standardly 100 reqs / 15 mins for all APIs)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', apiLimiter);

// For explicit auth endpoints (brute-force protection)
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many login attempts. Try again later.' }
});
app.use('/api/auth/login', loginLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.get('/api/version', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'demo',
            build: process.env.VITE_APP_ENV || 'production'
        }
    });
});
app.use('/api/auth', authRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/consumption', consumptionRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/decision', decisionRoutes);
app.use('/api', systemRoutes); // Mounts /notifications and /system/scorecard

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot find ${req.originalUrl} on this server`,
    });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Connect MQTT and Start WebSockets
mqttBroker.start()
    .catch(err => {
        console.warn('⚠️  Embedded MQTT broker port 1883 in use. Connecting to external Mosquitto daemon...');
    })
    .finally(() => {
        mqttService.init(io);
        httpServer.listen(PORT, () => {
            console.log(`LOGIS-AI backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        });
    });

module.exports = app;
