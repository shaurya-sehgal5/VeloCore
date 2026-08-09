const axios = require("axios");
const config = require("../../config/env");

class VaultService {

  constructor() {
    this.baseURL =
      config.VAULT_ADDR ||
      "http://vault.vault.svc:8200";

    this.token = config.VAULT_TOKEN;
  }

  async putSecret(path, data) {

    if (!this.token) {
      throw new Error("VAULT_TOKEN is not configured.");
    }

    await axios.post(
      `${this.baseURL}/v1/${path}`,
      {
        data,
      },
      {
        headers: {
          "X-Vault-Token": this.token,
        },
      }
    );

    return true;
  }

  async getSecret(path) {

    if (!this.token) {
      throw new Error("VAULT_TOKEN is not configured.");
    }

    const response = await axios.get(
      `${this.baseURL}/v1/${path}`,
      {
        headers: {
          "X-Vault-Token": this.token,
        },
      }
    );

    return response.data.data.data;
  }
}

module.exports = new VaultService();