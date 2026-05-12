const { spawnSync } = require('child_process');
const path = require('path');

const scripts = [
  'cloudPreview.ui.cjs',
  'cloudImagePreview.ui.cjs',
  'cloudVoicePreview.ui.cjs',
];

for (const script of scripts) {
  const fullPath = path.join(__dirname, script);
  const result = spawnSync(process.execPath, [fullPath], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(JSON.stringify({
  suite: 'cloud-restore-smoke',
  scripts,
  success: true,
}));
