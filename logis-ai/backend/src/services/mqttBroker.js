const { Aedes } = require('aedes');
const net = require('net');

class MQTTBroker {
    constructor(port = 1883) {
        this.port = port;
        this.server = null;
    }

    async start() {
        const aedes = new Aedes();
        this.server = net.createServer(aedes.handle);
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.log(`[IoT Broker] Embedded Aedes MQTT broker running on port ${this.port}`);
                resolve();
            });

            this.server.on('error', (err) => {
                console.error('[IoT Broker] Error starting embedded broker:', err);
                reject(err);
            });
        });
    }
}

module.exports = new MQTTBroker();
