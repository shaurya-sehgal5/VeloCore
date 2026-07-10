const db = require("../../config/db");
const net = require("net");

class PortService {

    constructor() {

        this.startPort = 9000;
        this.endPort = 9999;

    }

    async isPortAvailable(port) {

        return new Promise(resolve => {

            const server = net.createServer();

            server.once("error", () => {

                resolve(false);

            });

            server.once("listening", () => {

                server.close();

                resolve(true);

            });

            server.listen(port);

        });

    }

    async allocate() {

        const result = await db.query(`
            SELECT host_port
            FROM deployments
            WHERE status = 'RUNNING'
            AND host_port IS NOT NULL
        `);

        const usedPorts = result.rows.map(r => r.host_port);

        for (let port = this.startPort; port <= this.endPort; port++) {

            if (usedPorts.includes(port)) {
                continue;
            }

            const free = await this.isPortAvailable(port);

            if (free) {

                return port;

            }

        }

        throw new Error("No free ports available.");

    }

}

module.exports = new PortService();