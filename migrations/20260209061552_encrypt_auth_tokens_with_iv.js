const crypto = require("crypto");

// Defaults from config
const algorithm = "aes256";
const inputEncoding = "utf8";
const outputEncoding = "hex";

// Legacy decryption using createDecipher (no IV)
function legacyDecrypt(encrypted, secret) {
  const decipher = crypto.createDecipher(algorithm, secret);
  let decrypted = decipher.update(encrypted, outputEncoding, inputEncoding);
  decrypted += decipher.final(inputEncoding);
  return decrypted;
}

// Legacy encryption using createCipher (no IV)
function legacyEncrypt(value, secret) {
  const cipher = crypto.createCipher(algorithm, secret);
  let encrypted = cipher.update(value, inputEncoding, outputEncoding);
  encrypted += cipher.final(outputEncoding);
  return encrypted;
}

// New encryption using createCipheriv (with IV)
function encryptWithIv(value, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(value, inputEncoding, outputEncoding);
  encrypted += cipher.final(outputEncoding);
  return `V2:${iv.toString(outputEncoding)}:${encrypted}`;
}

// New decryption using createDecipheriv (with IV)
function decryptWithIv(encrypted, secret) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[1], outputEncoding);
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, outputEncoding, inputEncoding);
  decrypted += decipher.final(inputEncoding);
  return decrypted;
}

exports.up = function up(knex) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set to run this migration");
  }

  return knex("messaging_service")
    .select("messaging_service_sid", "encrypted_auth_token")
    .whereNot("encrypted_auth_token", "")
    .then((rows) => {
      const updates = rows
        .filter((row) => !row.encrypted_auth_token.startsWith("V2:"))
        .map((row) => {
          const decrypted = legacyDecrypt(
            row.encrypted_auth_token,
            sessionSecret
          );
          const reEncrypted = encryptWithIv(decrypted, sessionSecret);
          return knex("messaging_service")
            .where("messaging_service_sid", row.messaging_service_sid)
            .update({ encrypted_auth_token: reEncrypted });
        });
      return Promise.all(updates);
    });
};

exports.down = function down(knex) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set to run this migration");
  }

  return knex("messaging_service")
    .select("messaging_service_sid", "encrypted_auth_token")
    .whereNot("encrypted_auth_token", "")
    .then((rows) => {
      const updates = rows
        .filter((row) => row.encrypted_auth_token.startsWith("V2:"))
        .map((row) => {
          const decrypted = decryptWithIv(
            row.encrypted_auth_token,
            sessionSecret
          );
          const reEncrypted = legacyEncrypt(decrypted, sessionSecret);
          return knex("messaging_service")
            .where("messaging_service_sid", row.messaging_service_sid)
            .update({ encrypted_auth_token: reEncrypted });
        });
      return Promise.all(updates);
    });
};
