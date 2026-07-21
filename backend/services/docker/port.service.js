const db = require("../../config/db");
const net = require("net");

class PortService {

    constructor() {

        this.startPort = 50000;
        this.endPort = 60000;

    }

    async isPortAvailable(port) {

        return new Promise((resolve) => {

            const server = net.createServer();

            server.once("error", () => {
                resolve(false);
            });

            server.once("listening", () => {
                server.close(() => resolve(true));
            });

            server.listen(port, "127.0.0.1");

        });

    }

    async allocate() {

        const result = await db.query(`
        SELECT host_port
        FROM deployment_services
        WHERE status = 'RUNNING'
        AND host_port IS NOT NULL
    `);

        const usedPorts = result.rows.map(r => Number(r.host_port));

        console.log("Used Ports:", usedPorts);

        for (let port = this.startPort; port <= this.endPort; port++) {

            if (usedPorts.includes(port)) {
                continue;
            }

            const free = await this.isPortAvailable(port);

            if (free) {
                console.log(`Allocated Port: ${port}`);
                return port;
            }
        }

        throw new Error("No free ports available.");
    }

}

module.exports = new PortService();