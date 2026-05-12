const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const targetFile = path.join(resDir, 'mipmap-mdpi', 'ic_launcher.webp');

test('generate-icons creates missing native res folders before writing assets', () => {
  fs.rmSync(resDir, { recursive: true, force: true });

  const result = spawnSync(process.execPath, [path.join(__dirname, 'generate-icons.js')], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.equal(fs.existsSync(targetFile), true);
});
