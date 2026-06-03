import fs from "fs";
import path from "path";
import stream from "stream";

import type { StorageBackend } from "./types";

const OUTPUT_DIR = path.join(process.cwd(), "spoke-exports");

const ensureDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
};

const localPath = (_bucket: string, key: string) =>
  path.join(OUTPUT_DIR, key.replace(/\//g, "_"));

const upload = async (bucket: string, key: string, payload: any) => {
  ensureDir();
  fs.writeFileSync(localPath(bucket, key), payload);
};

const getUploadStream = async (bucket: string, key: string) => {
  ensureDir();
  const filePath = localPath(bucket, key);
  const writeStream = fs.createWriteStream(filePath);
  // Wrap so callers can listen for "finish" on this stream directly
  const passThrough = new stream.PassThrough();
  passThrough.pipe(writeStream);
  return passThrough;
};

const getDownloadUrl = async (bucket: string, key: string) =>
  `file://${localPath(bucket, key)}`;

const backend: StorageBackend = { upload, getUploadStream, getDownloadUrl };

export default backend;
