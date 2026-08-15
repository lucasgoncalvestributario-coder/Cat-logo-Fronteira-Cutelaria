import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Design an SVG with black square background and "CATÁLOGO" in orange
function createSvg(size) {
  const fontSize = Math.round(size * 0.16);
  const letterSpacing = Math.round(size * 0.02);
  const strokeWidth = Math.max(1, Math.round(size * 0.008));
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7f11" />
      <stop offset="50%" stop-color="#ff6b00" />
      <stop offset="100%" stop-color="#e05300" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a1f14" />
      <stop offset="100%" stop-color="#141417" />
    </linearGradient>
  </defs>

  <!-- Deep Black Square Background -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="#000000" />

  <!-- Subtle refined inner border -->
  <rect x="${Math.round(size * 0.04)}" y="${Math.round(size * 0.04)}" width="${Math.round(size * 0.92)}" height="${Math.round(size * 0.92)}" fill="none" stroke="#ff6b00" stroke-width="${strokeWidth}" stroke-opacity="0.25" rx="${Math.round(size * 0.06)}" />

  <!-- Centered "CATÁLOGO" in vibrant orange with luxury typography -->
  <text 
    x="50%" 
    y="53%" 
    font-family="'Cinzel', 'Plus Jakarta Sans', 'Arial Black', 'Trebuchet MS', 'Impact', sans-serif" 
    font-size="${fontSize}px" 
    font-weight="900" 
    letter-spacing="${letterSpacing}px" 
    fill="url(#orangeGrad)" 
    text-anchor="middle" 
    dominant-baseline="central"
  >
    CATÁLOGO
  </text>
</svg>
`;
}

async function generateAll() {
  const publicDir = path.resolve(process.cwd(), 'public');

  const icons = [
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.png', size: 64 },
  ];

  for (const icon of icons) {
    const svgBuffer = Buffer.from(createSvg(icon.size));
    const outputPath = path.join(publicDir, icon.name);
    await sharp(svgBuffer)
      .resize(icon.size, icon.size)
      .png({ compressionLevel: 9 })
      .toFile(outputPath);
    console.log(`Generated ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Also save a logo.svg in public
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), createSvg(512).trim());
  console.log('Generated logo.svg');
}

generateAll().catch(err => {
  console.error(err);
  process.exit(1);
});
