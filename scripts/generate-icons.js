/* global __dirname, Buffer */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/images/calculator-icon.svg');
const outputDir = path.join(__dirname, '../assets/images');
const nativeResDir = path.join(__dirname, '../android/app/src/main/res');

const transparentBackground = { r: 0, g: 0, b: 0, alpha: 0 };
const adaptiveBackgroundColor = { r: 31, g: 31, b: 34, alpha: 1 };
const fullIconScale = 1;
const adaptiveForegroundScale = 0.84;
const launcherSizes = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];
const adaptiveSizes = [
  ['mipmap-mdpi', 108],
  ['mipmap-hdpi', 162],
  ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324],
  ['mipmap-xxxhdpi', 432],
];
const splashSizes = [
  ['drawable-mdpi', 200],
  ['drawable-hdpi', 300],
  ['drawable-xhdpi', 400],
  ['drawable-xxhdpi', 600],
  ['drawable-xxxhdpi', 800],
];

async function renderCanvas(inputBuffer, size, scale, background = transparentBackground) {
  const scaledSize = Math.round(size * scale);
  const layer = await sharp(inputBuffer)
    .resize(scaledSize, scaledSize)
    .png()
    .toBuffer();

  if (scaledSize >= size) {
    const left = Math.round((scaledSize - size) / 2);
    const top = Math.round((scaledSize - size) / 2);
    return sharp(layer)
      .extract({ left, top, width: size, height: size })
      .png()
      .toBuffer();
  }

  const offset = Math.round((size - scaledSize) / 2);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: layer, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function renderFullIcon(svgContent, size) {
  return renderCanvas(Buffer.from(svgContent), size, fullIconScale);
}

async function renderAdaptiveForeground(svgContent, size) {
  return renderCanvas(Buffer.from(svgContent), size, adaptiveForegroundScale, transparentBackground);
}

async function renderAdaptiveBackground(size) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: adaptiveBackgroundColor,
    },
  })
    .png()
    .toBuffer();
}

async function writeWebp(buffer, filePath) {
  await sharp(buffer)
    .webp({ quality: 100 })
    .toFile(filePath);
}

async function writePng(buffer, filePath) {
  await sharp(buffer)
    .png()
    .toFile(filePath);
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writeNativeLauncherAssets(svgContent) {
  for (const [folder, size] of launcherSizes) {
    const dir = path.join(nativeResDir, folder);
    await ensureDir(dir);
    const launcher = await renderFullIcon(svgContent, size);
    await writeWebp(launcher, path.join(dir, 'ic_launcher.webp'));
    await writeWebp(launcher, path.join(dir, 'ic_launcher_round.webp'));
  }

  for (const [folder, size] of adaptiveSizes) {
    const dir = path.join(nativeResDir, folder);
    await ensureDir(dir);
    const foreground = await renderAdaptiveForeground(svgContent, size);
    const monochrome = await renderAdaptiveForeground(svgContent, size);
    const background = await renderAdaptiveBackground(size);

    await writeWebp(foreground, path.join(dir, 'ic_launcher_foreground.webp'));
    await writeWebp(monochrome, path.join(dir, 'ic_launcher_monochrome.webp'));
    await writeWebp(background, path.join(dir, 'ic_launcher_background.webp'));
  }

  for (const [folder, size] of splashSizes) {
    const dir = path.join(nativeResDir, folder);
    await ensureDir(dir);
    const splash = await renderFullIcon(svgContent, size);
    await writePng(splash, path.join(dir, 'splashscreen_logo.png'));
  }
}

async function generateIcons() {
  const svg = fs.readFileSync(svgPath);
  const svgContent = svg.toString();
  const icon1024 = await renderFullIcon(svgContent, 1024);
  const icon512 = await renderFullIcon(svgContent, 512);
  const adaptiveForeground512 = await renderAdaptiveForeground(svgContent, 512);
  const adaptiveMonochrome512 = await renderAdaptiveForeground(svgContent, 512);
  const adaptiveBackground512 = await renderAdaptiveBackground(512);

  await sharp(icon1024)
    .png()
    .toFile(path.join(outputDir, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  await sharp(adaptiveForeground512)
    .png()
    .toFile(path.join(outputDir, 'android-icon-foreground.png'));
  console.log('Generated android-icon-foreground.png (512x512)');

  await sharp(adaptiveMonochrome512)
    .png()
    .toFile(path.join(outputDir, 'android-icon-monochrome.png'));
  console.log('Generated android-icon-monochrome.png (512x512)');

  await sharp(icon512)
    .resize(48, 48)
    .png()
    .toFile(path.join(outputDir, 'favicon.png'));
  console.log('Generated favicon.png (48x48)');

  await sharp(icon512)
    .resize(200, 200)
    .png()
    .toFile(path.join(outputDir, 'splash-icon.png'));
  console.log('Generated splash-icon.png (200x200)');

  await sharp(adaptiveBackground512)
    .png()
    .toFile(path.join(outputDir, 'android-icon-background.png'));
  console.log('Generated android-icon-background.png (512x512)');

  await writeNativeLauncherAssets(svgContent);
  console.log('Generated native Android launcher assets');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
