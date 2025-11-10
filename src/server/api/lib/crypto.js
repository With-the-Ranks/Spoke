const { config } = require("../../../config");
const crypto = require("crypto");

const key = config.SESSION_SECRET;
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

  // Prepend IV to encrypted data (IV is not secret)
  return `${iv.toString(outputEncoding)}:${encrypted}`;
};

const symmetricDecrypt = (encrypted) => {
  const parts = encrypted.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], outputEncoding);
  const encryptedData = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, outputEncoding, inputEncoding);
  decrypted += decipher.final(inputEncoding);
  return decrypted;
};

module.exports = { symmetricEncrypt, symmetricDecrypt };
