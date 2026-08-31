import { readFileSync } from "node:fs";
import { extname } from "node:path";

const ENDPOINT = "http://localhost:3000/api/analyze-garment";

const EXTENSION_TO_MEDIA_TYPE = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const imagePath = process.argv[2];

if (!imagePath) {
  console.error("Usage: node scripts/test-analyze-garment.mjs <path-to-image>");
  process.exit(1);
}

const mediaType = EXTENSION_TO_MEDIA_TYPE[extname(imagePath).toLowerCase()];

if (!mediaType) {
  console.error(
    `Unsupported file extension: ${extname(imagePath)}. Supported: ${Object.keys(EXTENSION_TO_MEDIA_TYPE).join(", ")}`
  );
  process.exit(1);
}

let base64;
try {
  base64 = readFileSync(imagePath).toString("base64");
} catch (error) {
  console.error(`Failed to read file at ${imagePath}: ${error.message}`);
  process.exit(1);
}

let response;
try {
  response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ base64, mediaType }),
  });
} catch (error) {
  console.error(
    `Failed to reach ${ENDPOINT}. Is the dev server running (npm run dev)?\n${error.message}`
  );
  process.exit(1);
}

const body = await response.json();

if (!response.ok) {
  console.error(`Request failed (${response.status}):`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
