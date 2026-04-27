const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/images/calculator-icon.svg');
const outputDir = path.join(__dirname, '../assets/images');

async function generateIcons() {
  const svg = fs.readFileSync(svgPath);

  // Generate 1024x1024 (App Store icon)
  await sharp(svg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(outputDir, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // Generate 512x512 (Android foreground)
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'android-icon-foreground.png'));
  console.log('Generated android-icon-foreground.png (512x512)');

  // Generate monochrome version (Android adaptive icon)
  const monoSvg = svg.toString().replace(/fill="url(#orange)"/g, 'fill="#FFFFFF"')
    .replace(/fill="url(#gray)"/g, 'fill="#D1D1D6"')
    .replace(/fill="url(#darkGray)"/g, 'fill="#636366"')
    .replace(/fill="url(#bg)"/g, 'fill="#000000"');

  await sharp(Buffer.from(monoSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'android-icon-monochrome.png'));
  console.log('Generated android-icon-monochrome.png (512x512)');

  // Generate favicon
  await sharp(svg)
    .resize(48, 48)
    .png()
    .toFile(path.join(outputDir, 'favicon.png'));
  console.log('Generated favicon.png (48x48)');

  // Generate splash icon
  await sharp(svg)
    .resize(200, 200)
    .png()
    .toFile(path.join(outputDir, 'splash-icon.png'));
  console.log('Generated splash-icon.png (200x200)');

  // Generate background for Android adaptive icon
  await sharp(svg)
    .resize(512, 512)
    .blur(5)
    .grayscale(true)
    .png()
    .toFile(path.join(outputDir, 'android-icon-background.png'));
  console.log('Generated android-icon-background.png (512x512)');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
