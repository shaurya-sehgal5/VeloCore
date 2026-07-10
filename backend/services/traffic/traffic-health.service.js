const axios = require("axios");

class TrafficHealthService {
  async verify(hostPort) {
    const urls = [
      `http://localhost:${hostPort}/health`,
      `http://localhost:${hostPort}/`,
    ];

    for (const url of urls) {
      try {
        const res = await axios.get(url, {
          timeout: 5000,
        });

        if (res.status >= 200 && res.status < 500) {
          return true;
        }
      } catch (_) {}
    }

    return false;
  }
}

module.exports = new TrafficHealthService();