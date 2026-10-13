const Device = require('../models/Device');
const TelemetryRecord = require('../models/TelemetryRecord');
const DeviceEvent = require('../models/DeviceEvent');

exports.getDevices = async (req, res) => {
    try {
        const status = req.query.status;
        const query = status ? { status } : {};
        const devices = await Device.find(query).populate('location').populate('item').sort('-lastSeenAt');
        res.status(200).json({ success: true, data: devices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDeviceSummary = async (req, res) => {
    try {
        const devices = await Device.find();
        let summary = {
            total: devices.length,
            online: 0,
            offline: 0,
            warning: 0,
            maintenance: 0,
            inactive: 0
        };
        devices.forEach(d => {
            if (summary[d.status] !== undefined) summary[d.status]++;
        });
        res.status(200).json({ success: true, data: summary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDeviceById = async (req, res) => {
    try {
        const device = await Device.findById(req.params.id)
            .populate('location')
            .populate('item');
        if (!device) return res.status(404).json({ success: false, message: 'Device not found' });
        res.status(200).json({ success: true, data: device });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDeviceTelemetry = async (req, res) => {
    try {
        const records = await TelemetryRecord.find({ device: req.params.id })
            .sort('-timestamp')
            .limit(100);
        res.status(200).json({ success: true, data: records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createDevice = async (req, res) => {
    try {
        const device = await Device.create(req.body);
        res.status(201).json({ success: true, data: device });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
