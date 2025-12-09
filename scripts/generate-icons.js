/**
 * Generate PWA icons from favicon.svg
 * 
 * This script uses sharp to generate PNG icons from the SVG favicon
 * Run: node scripts/generate-icons.js
 * 
 * Requires: npm install --save-dev sharp
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const inputFile = path.join(__dirname, '../public/favicon.svg')
const outputDir = path.join(__dirname, '../public')

async function generateIcons() {
  console.log('Generating PWA icons...')
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found`)
    process.exit(1)
  }

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`)
    
    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 } // Dark background
        })
        .png()
        .toFile(outputFile)
      
      console.log(`✓ Generated ${outputFile}`)
    } catch (error) {
      console.error(`Error generating ${outputFile}:`, error)
    }
  }
  
  console.log('✓ All icons generated successfully!')
}

generateIcons().catch(console.error)

