# App Icons Setup

## Required Icons for PWA

Your app needs these icon files in the `public` folder:
- `icon-192x192.png` (192x192 pixels)
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels)

## Quick Option 1: Use Favicon Generator

1. Go to: https://realfavicongenerator.net/
2. Upload a logo or icon (512x512 minimum)
3. Generate and download all icons
4. Extract and place in `/public` folder

## Quick Option 2: Use Canva (Free)

1. Go to: https://www.canva.com/
2. Create design: 512x512px
3. Add "SB" text with gradient background
4. Download as PNG
5. Resize to 192x192, 384x384, 512x512

## Quick Option 3: Use This Simple Icon

I've created a temporary icon generator below. You can:
1. Create a simple colored square with your app initial
2. Use any image editor (Paint, GIMP, Photoshop)
3. Save as PNG in the required sizes

## Suggested Design

**Background:** Gradient from #6366f1 (indigo) to #8b5cf6 (purple)
**Icon:** White "📚" emoji or "SB" text
**Style:** Modern, flat design

## Temporary Solution

For now, you can use placeholder icons. The app will work without them, but won't look as nice when installed.

Run this command to generate placeholder icons:
```bash
# Using ImageMagick (if installed)
convert -size 192x192 xc:#6366f1 -pointsize 100 -fill white -gravity center -annotate +0+0 "SB" public/icon-192x192.png
convert -size 384x384 xc:#6366f1 -pointsize 200 -fill white -gravity center -annotate +0+0 "SB" public/icon-384x384.png
convert -size 512x512 xc:#6366f1 -pointsize 300 -fill white -gravity center -annotate +0+0 "SB" public/icon-512x512.png
```
