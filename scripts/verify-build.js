import fs from 'fs';
import path from 'path';

console.log('═══════════════════════════════════════════');
console.log('VERCEL BUILD VERIFICATION');
console.log('═══════════════════════════════════════════\n');

// Check dist exists
if (!fs.existsSync('dist')) {
  console.log('❌ ERROR: dist/ folder not found');
  process.exit(1);
}

// List all assets
console.log('📦 DIST CONTENTS:');
const distFiles = fs.readdirSync('dist');
console.log(distFiles.join('\n'));

// Check assets folder
if (fs.existsSync('dist/assets')) {
  console.log('\n📁 ASSETS FOLDER:');
  const assets = fs.readdirSync('dist/assets');
  assets.forEach(file => {
    const filePath = path.join('dist/assets', file);
    const stats = fs.statSync(filePath);
    console.log(`  ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
  });
}

// Check index.html
console.log('\n📄 INDEX.HTML CSS REFERENCES:');
const indexHtml = fs.readFileSync('dist/index.html', 'utf-8');
const cssMatches = indexHtml.match(/href="([^"]*\.css)"/g);
if (cssMatches) {
  cssMatches.forEach(match => console.log(`  ${match}`));
} else {
  console.log('  ❌ NO CSS LINKS FOUND');
}

// Check CSS content
const cssFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
if (cssFiles.length > 0) {
  console.log('\n🎨 CSS FILE ANALYSIS:');
  cssFiles.forEach(file => {
    const cssPath = path.join('dist/assets', file);
    const css = fs.readFileSync(cssPath, 'utf-8');

    console.log(`\n  File: ${file}`);
    console.log(`  Size: ${(css.length / 1024).toFixed(2)} KB`);
    console.log(`  Has --color-primary: ${css.includes('--color-primary') ? '✅' : '❌'}`);
    console.log(`  Has .text-h1: ${css.includes('.text-h1') ? '✅' : '❌'}`);
    console.log(`  Has .text-neon-cyan: ${css.includes('.text-neon-cyan') ? '✅' : '❌'}`);
    console.log(`  First 200 chars:\n    ${css.substring(0, 200).replace(/\n/g, '\n    ')}`);
  });
} else {
  console.log('\n❌ NO CSS FILES FOUND IN DIST/ASSETS');
}

console.log('\n═══════════════════════════════════════════');
console.log('BUILD VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════');