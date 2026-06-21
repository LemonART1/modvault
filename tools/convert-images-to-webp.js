// One-off conversion of images/mods/*.{jpg,png} to WebP for faster page loads
// (PageSpeed Insights flagged the heavy screenshots). Run once, then
// js/data/mods.js is updated to point at the new .webp files and the static
// mod pages are regenerated from it.
//
// Conversion and deletion of the originals are two separate passes: on
// Windows, antivirus/indexing briefly locks a file right after it's written,
// so deleting the *source* immediately after writing its .webp can hit
// EBUSY. Converting everything first, then deleting originals with retries,
// avoids that.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "images", "mods");
const MAX_WIDTH = 1600;
const QUALITY = 78;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function unlinkWithRetry(filePath, attempts = 5, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch (error) {
      if (error.code !== "EBUSY" || i === attempts - 1) throw error;
      await sleep(delayMs);
    }
  }
}

async function run() {
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
  let beforeTotal = 0;
  let afterTotal = 0;
  const converted = [];

  for (const file of files) {
    const srcPath = path.join(dir, file);
    const destName = file.replace(/\.(jpe?g|png)$/i, ".webp");
    const destPath = path.join(dir, destName);

    const before = fs.statSync(srcPath).size;
    beforeTotal += before;

    const image = sharp(srcPath).rotate();
    const meta = await image.metadata();
    if (meta.width > MAX_WIDTH) image.resize({ width: MAX_WIDTH });

    await image.webp({ quality: QUALITY }).toFile(destPath);

    const after = fs.statSync(destPath).size;
    afterTotal += after;
    converted.push([file, destName]);
    console.log(`${file} -> ${destName}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
  }

  console.log(`\nConverted ${converted.length} images.`);
  console.log(`Total: ${(beforeTotal / 1024 / 1024).toFixed(1)}MB -> ${(afterTotal / 1024 / 1024).toFixed(1)}MB`);

  fs.writeFileSync(
    path.join(__dirname, "image-rename-map.json"),
    JSON.stringify(Object.fromEntries(converted), null, 2)
  );

  console.log("\nDeleting original jpg/png files...");
  let deleted = 0;
  const failed = [];
  for (const [file] of converted) {
    try {
      await unlinkWithRetry(path.join(dir, file));
      deleted++;
    } catch (error) {
      failed.push(file);
      console.warn(`Could not delete ${file}: ${error.message}`);
    }
  }
  console.log(`Deleted ${deleted}/${converted.length} originals.`);
  if (failed.length) console.log("Still locked, delete manually:", failed.join(", "));
}

run();
