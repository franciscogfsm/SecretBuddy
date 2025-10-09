const fs = require("fs");
const path = require("path");

// 1x1 transparent PNG (base64)
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+NN6kAAAAASUVORK5CYII=";
const buffer = Buffer.from(pngBase64, "base64");

const targets = [
  path.join(__dirname, "..", "assets", "favicon.png"),
  path.join(__dirname, "..", "assets", "splash.png"),
];

for (const t of targets) {
  try {
    fs.writeFileSync(t, buffer);
    console.log("Wrote placeholder to", t);
  } catch (err) {
    console.error("Failed to write", t, err && err.message ? err.message : err);
  }
}
