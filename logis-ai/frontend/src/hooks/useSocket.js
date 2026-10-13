import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null); // to notify UI

    useEffect(() => {
        if (!socket) {
            socket = io(URL, {
                reconnection: true,
                withCredentials: true
            });
        }

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));

        // Listeners for specific IoT data:
        socket.on('device_status_updated', (data) => {
            setLastEvent({ type: 'device_status_updated', data, ts: Date.now() });
        });

        socket.on('telemetry_received', (data) => {
            setLastEvent({ type: 'telemetry_received', data, ts: Date.now() });
        });

        socket.on('inventory_updated', (data) => {
            setLastEvent({ type: 'inventory_updated', data, ts: Date.now() });
        });

        socket.on('iot_alert_created', (data) => {
            setLastEvent({ type: 'iot_alert_created', data, ts: Date.now() });
        });

        return () => {
            // Keep it alive globally so we don't disconnect on navigation
        };
    }, []);

    return { isConnected, lastEvent, socket };
};
