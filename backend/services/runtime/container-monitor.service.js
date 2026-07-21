const { exec } = require("child_process");
const metrics = require("../monitoring/metrics.service");

function parseSize(value) {
    const text = value.trim();

    if (text.endsWith("KiB"))
        return parseFloat(text) * 1024;

    if (text.endsWith("MiB"))
        return parseFloat(text) * 1024 * 1024;

    if (text.endsWith("GiB"))
        return parseFloat(text) * 1024 * 1024 * 1024;

    if (text.endsWith("kB"))
        return parseFloat(text) * 1000;

    if (text.endsWith("MB"))
        return parseFloat(text) * 1000 * 1000;

    if (text.endsWith("GB"))
        return parseFloat(text) * 1000 * 1000 * 1000;

    if (text.endsWith("B"))
        return parseFloat(text);

    return 0;
}

class ContainerMonitor {
    start() {

        setInterval(async () => {

            exec(
                'docker stats --no-stream --format "{{.Container}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}|{{.PIDs}}"',
                (err, stdout) => {

                    if (err) return;

                    const lines = stdout
                        .trim()
                        .split("\n")
                        .filter(Boolean);

                    metrics.runtimeCount.set(lines.length);

                    for (const line of lines) {
                      
                        const [
                            id,
                            name,
                            cpu,
                            memUsage,
                            network,
                            pids,
                        ] = line.split("|");

                        const cpuPercent =
                            parseFloat(cpu.replace("%", ""));

                        const memory =
                            parseFloat(
                                memUsage.split("/")[0]
                            );
                        const [
                            rx,
                            tx,
                        ] = network.split("/");
                        
                        metrics.containerNetworkRx
                            .labels(name, name)
                            .set(parseSize(rx));

                        metrics.containerNetworkTx
                            .labels(name, name)
                            .set(parseSize(tx));

                        metrics.containerPids
                            .labels(name, name)
                            .set(Number(pids));
                        metrics.containerCpu
                            .labels(name, name)
                            .set(cpuPercent);

                        metrics.containerMemory
                            .labels(name, name)
                            .set(memory);
                    }

                });

        }, 5000);

    }
}

module.exports = new ContainerMonitor();