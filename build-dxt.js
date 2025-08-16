const fs = require('fs');
const path = require('path');

// DXTパッケージ用のディレクトリを作成
const buildDir = 'dxt-build';
console.log('Creating DXT build directory...');

if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
    console.log('Removed existing build directory');
}
fs.mkdirSync(buildDir);

// 必要なファイルをコピー
const filesToCopy = [
    'futurevuls-mcp.js',
    'package.json',
    'manifest.json',
    'README.md',
    'node_modules'  // 重要: 依存関係を含める
];

console.log('Copying files...');
filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(buildDir, file);
    
    if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
            console.log(`📁 Copied directory: ${file}`);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`📄 Copied file: ${file}`);
        }
    } else {
        console.log(`⚠️  File not found: ${file}`);
    }
});

console.log('\n✅ DXT build completed!');
console.log(`📦 Build files are in: ${path.join(__dirname, buildDir)}`);
console.log('\nNext: Zip the dxt-build folder as .dxt file');