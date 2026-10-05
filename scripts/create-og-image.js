const sharp = require('sharp');

// Create a 1200x630 OG image with Flavor Web branding
const width = 1200;
const height = 630;

async function createOgImage() {
  // Background - deep space void
  const bg = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 5, g: 6, b: 10, alpha: 1 }
    }
  })
  .png()
  .toBuffer();

  // Create the main visual elements
  // We'll create an SVG overlay with the branding
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Aurora gradient for text -->
        <linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="20%" stop-color="#ede8dc"/>
          <stop offset="38%" stop-color="#f4d59e"/>
          <stop offset="50%" stop-color="#e879c8"/>
          <stop offset="62%" stop-color="#a8d0e6"/>
          <stop offset="80%" stop-color="#ede8dc"/>
        </linearGradient>
        <!-- Glow filter -->
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Subtle noise pattern -->
        <pattern id="noise" width="100" height="100" patternUnits="userSpaceOnUse">
          <image href="data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E" width="200" height="200" opacity="0.03"/>
        </pattern>
        <!-- Radial vignette -->
        <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(5,6,10,0)"/>
          <stop offset="100%" stop-color="rgba(5,6,10,0.8)"/>
        </radialGradient>
      </defs>
      
      <!-- Background noise overlay -->
      <rect width="100%" height="100%" fill="url(#noise)"/>
      
      <!-- Radial vignette -->
      <ellipse cx="600" cy="315" rx="800" ry="400" fill="url(#vignette)" />
      
      <!-- Floating orbs representing ingredients -->
      <g opacity="0.15">
        <circle cx="150" cy="180" r="45" fill="#FFB347" filter="url(#glow)"/>
        <circle cx="1050" cy="150" r="38" fill="#7DD87D" filter="url(#glow)"/>
        <circle cx="200" cy="480" r="52" fill="#E879C8" filter="url(#glow)"/>
        <circle cx="1000" cy="500" r="42" fill="#8FBC8F" filter="url(#glow)"/>
        <circle cx="600" cy="100" r="30" fill="#A8D0E6" filter="url(#glow)"/>
        <circle cx="600" cy="550" r="35" fill="#F4D59E" filter="url(#glow)"/>
      </g>
      
      <!-- Subtle connection lines between orbs -->
      <g stroke="#ffffff" stroke-width="0.5" opacity="0.06">
        <line x1="150" y1="180" x2="600" y2="315"/>
        <line x1="1050" y1="150" x2="600" y2="315"/>
        <line x1="200" y1="480" x2="600" y2="315"/>
        <line x1="1000" y1="500" x2="600" y2="315"/>
        <line x1="600" y1="100" x2="600" y2="315"/>
        <line x1="600" y1="550" x2="600" y2="315"/>
        <line x1="150" y1="180" x2="200" y2="480"/>
        <line x1="1050" y1="150" x2="1000" y2="500"/>
      </g>
      
      <!-- Main title -->
      <text x="600" y="280" text-anchor="middle" font-family="'Space Grotesk', system-ui, sans-serif" font-size="64" font-weight="700" fill="#ede8dc" letter-spacing="-2.5">
        Flavor <tspan fill="url(#aurora)" font-weight="700">Web</tspan>
      </text>
      
      <!-- Subtitle -->
      <text x="600" y="355" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="16" font-weight="500" fill="#ede8dc" opacity="0.7" letter-spacing="4" text-transform="uppercase">
        3D Ingredient Pairing Explorer
      </text>
      
      <!-- Tagline -->
      <text x="600" y="410" text-anchor="middle" font-family="'Space Grotesk', system-ui, sans-serif" font-size="20" fill="#ede8dc" opacity="0.6" letter-spacing="-0.5">
        Search an ingredient. Fly to it. See what it loves.
      </text>
      
      <!-- Bottom accent -->
      <line x1="400" y1="450" x2="800" y2="450" stroke="#ffb347" stroke-width="3" opacity="0.5"/>
      
      <!-- Category indicator dots -->
      <g font-family="'JetBrains Mono', monospace" font-size="10" fill="#ede8dc" opacity="0.4" text-anchor="middle">
        <circle cx="300" cy="520" r="4" fill="#FFB347"/><text x="300" y="540">Protein</text>
        <circle cx="420" cy="520" r="4" fill="#7DD87D"/><text x="420" y="540">Herbs</text>
        <circle cx="530" cy="520" r="4" fill="#FF6B47"/><text x="530" y="540">Spices</text>
        <circle cx="640" cy="520" r="4" fill="#8FBC8F"/><text x="640" y="540">Vegetables</text>
        <circle cx="770" cy="520" r="4" fill="#E879C8"/><text x="770" y="540">Fruits</text>
        <circle cx="880" cy="520" r="4" fill="#A8D0E6"/><text x="880" y="540">Dairy</text>
        <circle cx="980" cy="520" r="4" fill="#F4D59E"/><text x="980" y="540">Grains</text>
      </g>
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);
  
  await sharp(bg)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile('public/og-image.png');
    
  console.log('OG image created successfully at 1200x630');
}

createOgImage().catch(console.error);