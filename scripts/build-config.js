/**
 * Build configuration script for Page Monitor to n8n Chrome Extension
 * This script validates the extension configuration and prepares it for packaging
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Building Page Monitor to n8n extension configuration...\n');

// Check if manifest.json exists
const manifestPath = path.join(__dirname, '..', 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Error: manifest.json not found!');
  process.exit(1);
}

// Read and validate manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Validate required fields
const requiredFields = ['name', 'version', 'description', 'manifest_version'];
const missingFields = requiredFields.filter(field => !manifest[field]);

if (missingFields.length > 0) {
  console.error(`❌ Error: Missing required fields in manifest.json: ${missingFields.join(', ')}`);
  process.exit(1);
}

// Check if icons exist
const iconSizes = [16, 32, 48, 128];
const missingIcons = iconSizes.filter(size => {
  const iconPath = path.join(__dirname, '..', manifest.icons[size.toString()]);
  return !fs.existsSync(iconPath);
});

if (missingIcons.length > 0) {
  console.error(`❌ Error: Missing icon files: ${missingIcons.join(', ')}`);
  process.exit(1);
}

// Check if source files exist
const sourceFiles = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  manifest.options_ui?.page,
  ...manifest.content_scripts?.flatMap(cs => cs.js || []) || []
].filter(Boolean);

const missingFiles = sourceFiles.filter(file => {
  const filePath = path.join(__dirname, '..', file);
  return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
  console.error(`❌ Error: Missing source files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

console.log('✅ Manifest validation passed');
console.log(`   Name: ${manifest.name}`);
console.log(`   Version: ${manifest.version}`);
console.log(`   Manifest Version: ${manifest.manifest_version}`);
console.log('\n✅ All required files found');
console.log('✅ Extension is ready for packaging!\n');
