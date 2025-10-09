// Simple script to validate PNGs using jimp-compact
const fs = require("fs");
const path = require("path");
const Jimp = require("jimp-compact");

const assetsDir = path.join(__dirname, "..", "assets");
let ok = 0;
let fail = 0;

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

async function check() {
  if (!fs.existsSync(assetsDir)) {
    console.error("Assets folder not found:", assetsDir);
    process.exit(1);
  }

  const files = walk(assetsDir).filter((f) => f.toLowerCase().endsWith(".png"));
  console.log(`Found ${files.length} PNG(s) under ${assetsDir}`);

  for (const f of files) {
    process.stdout.write(`Checking: ${path.relative(process.cwd(), f)} ... `);
    try {
      // Jimp.read returns a Promise
      await Jimp.read(f);
      console.log("OK");
      ok++;
    } catch (err) {
      console.log("ERROR");
      console.error("  ->", err && err.message ? err.message : err);
      fail++;
    }
  }

  console.log(`\nSummary: OK=${ok}, FAIL=${fail}`);
  if (fail > 0) process.exit(2);
}

check();
