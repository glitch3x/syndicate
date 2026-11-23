const fs = require('fs');
const path = require('path');

['dist', 'public'].forEach(folder => {
  const outDir = path.join(__dirname, folder);
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(outDir, 'index.html'));
  fs.copyFileSync(path.join(__dirname, 'style.css'), path.join(outDir, 'style.css'));
  fs.cpSync(path.join(__dirname, 'js'), path.join(outDir, 'js'), { recursive: true });
  fs.cpSync(path.join(__dirname, 'assets'), path.join(outDir, 'assets'), { recursive: true });
});

console.log('⚡ THE SYNDICATE: Build ready in dist/ and public/');
