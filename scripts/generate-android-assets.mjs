import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve("public/icons/neurocity-malls-512.png");
const resourceRoot = path.resolve("android/app/src/main/res");
const launcherSizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const foregroundSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [density, size] of Object.entries(launcherSizes)) {
  const directory = path.join(resourceRoot, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  const image = await sharp(source).resize(size, size, { fit: "contain" }).png().toBuffer();
  await sharp(image).toFile(path.join(directory, "ic_launcher.png"));
  await sharp(image).toFile(path.join(directory, "ic_launcher_round.png"));
}

for (const [density, size] of Object.entries(foregroundSizes)) {
  const directory = path.join(resourceRoot, `mipmap-${density}`);
  const inset = Math.round(size * 0.18);
  await sharp({ create: { width: size, height: size, channels: 4, background: "#171916" } })
    .composite([{ input: await sharp(source).resize(size - inset * 2, size - inset * 2, { fit: "contain" }).png().toBuffer(), left: inset, top: inset }])
    .png()
    .toFile(path.join(directory, "ic_launcher_foreground.png"));
}

for (const directoryName of (await readdir(resourceRoot)).filter((name) => name.startsWith("drawable") && !name.includes("v24"))) {
  const target = path.join(resourceRoot, directoryName, "splash.png");
  let metadata;
  try { metadata = await sharp(target).metadata(); } catch { continue; }
  if (!metadata.width || !metadata.height) continue;
  const logoSize = Math.round(Math.min(metadata.width, metadata.height) * 0.28);
  const logo = await sharp(source).resize(logoSize, logoSize, { fit: "contain" }).png().toBuffer();
  await sharp({ create: { width: metadata.width, height: metadata.height, channels: 4, background: "#171916" } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(target);
}

console.log("Generated NeuroCity Android launcher and splash assets.");
