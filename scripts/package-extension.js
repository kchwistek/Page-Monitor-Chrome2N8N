/**
 * Package extension for Chrome Web Store submission
 * Creates a zip file with only the necessary files for publishing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Packaging Page Monitor to n8n extension for Chrome Web Store...\n');

// Read manifest to get version
const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;
const zipName = `page-monitor-to-n8n-v${version}.zip`;

// Remove old zip if exists
const zipPath = path.join(__dirname, '..', zipName);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log(`🗑️  Removed old package: ${zipName}`);
}

// Files and directories to include
const includePatterns = [
  'manifest.json',
  'LICENSE',
  'PRIVACY.md',
  'src/**/*',
  'assets/**/*'
];

// Files and directories to exclude
const excludePatterns = [
  '*.git*',
  'node_modules/**',
  '*.DS_Store',
  '*.log',
  'package*.json',
  'docs/**',
  'tests/**',
  'scripts/**',
  '.env*',
  'coverage/**',
  '*.zip',
  '*.tmp',
  '*.temp',
  '__pycache__/**',
  '*.py[cod]',
  '.vscode/**',
  '.idea/**',
  '*.swp',
  '*.swo',
  '*~',
  'Thumbs.db',
  '.nyc_output/**'
];

// Build zip command
const cwd = path.join(__dirname, '..');
const excludeArgs = excludePatterns.map(pattern => `-x "${pattern}"`).join(' ');

try {
  // Use zip command (works on Linux/Mac)
  // For Windows, you might need to use PowerShell or install zip
  const zipCommand = `cd "${cwd}" && zip -r "${zipName}" . ${excludeArgs} -q`;
  
  console.log('📝 Creating package...');
  execSync(zipCommand, { stdio: 'inherit' });
  
  // Verify zip was created
  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('\n✅ Package created successfully!');
    console.log(`   File: ${zipName}`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Location: ${path.relative(process.cwd(), zipPath)}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Go to Chrome Web Store Developer Dashboard');
    console.log('   2. Create a new item or update existing item');
    console.log('   3. Upload this zip file');
    console.log('   4. Fill in store listing details');
    console.log('   5. Submit for review\n');
  } else {
    console.error('❌ Error: Zip file was not created');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error creating package:', error.message);
  console.log('\n💡 Alternative: You can manually create a zip file with:');
  console.log('   - manifest.json');
  console.log('   - LICENSE');
  console.log('   - PRIVACY.md');
  console.log('   - src/ directory');
  console.log('   - assets/ directory');
  console.log('\n   Exclude: node_modules, tests, docs, scripts, .git, etc.\n');
  process.exit(1);
}

