const Jimp = require("jimp-compact");
const fs = require("fs");
const path = require("path");

const targets = [
  path.join(__dirname, "..", "assets", "favicon.png"),
  path.join(__dirname, "..", "assets", "splash.png"),
];

async function rewrite() {
  for (const t of targets) {
    if (!fs.existsSync(t)) {
      console.log("Not found:", t);
      continue;
    }
    try {
      console.log("Reading", t);
      const image = await Jimp.read(t);

      // Re-encode and overwrite as PNG
      await image.quality(100).writeAsync(t);
      console.log("Rewrote", t);
    } catch (err) {
      console.error(
        "Failed to rewrite",
        t,
        err && err.message ? err.message : err
      );
    }
  }
}

rewrite();
