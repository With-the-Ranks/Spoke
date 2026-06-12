const { config } = require("../../../config");
const crypto = require("crypto");

const key = crypto.createHash("sha256").update(config.SESSION_SECRET).digest();
const algorithm = config.ENCRYPTION_ALGORITHM;
const inputEncoding = config.ENCRYPTION_INPUT_ENCODING;
const outputEncoding = config.ENCRYPTION_OUTPUT_ENCODING;

if (!key) {
  throw new Error(
    "The SESSION_SECRET environment variable must be set to use crypto functions!"
  );
}

const symmetricEncrypt = (value) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, inputEncoding, outputEncoding);
  encrypted += cipher.final(outputEncoding);

  // Prepend IV to encrypted data (IV is not secret) and prefix with V2
  return `V2:${iv.toString(outputEncoding)}:${encrypted}`;
};

const symmetricDecrypt = (encrypted) => {
  // parts are V2, iv, and encrypted string
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[1], outputEncoding);
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, outputEncoding, inputEncoding);
  decrypted += decipher.final(inputEncoding);
  return decrypted;
};

module.exports = { symmetricEncrypt, symmetricDecrypt };
