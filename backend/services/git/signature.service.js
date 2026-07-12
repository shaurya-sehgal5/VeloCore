const crypto = require("crypto");

class SignatureService {
  generateSecret() {
    return crypto.randomBytes(32).toString("hex");
  }

  verify(secret, payload, signature) {
    if (!signature) {
      return false;
    }

    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

    console.log("Expected :", expected);
    console.log("Received :", signature);

    if (expected.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  }
}

module.exports = new SignatureService();