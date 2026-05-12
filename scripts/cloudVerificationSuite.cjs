const { spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(projectRoot, 'backend');
const commands = [
  {
    name: 'backend-api-regression',
    command: process.execPath,
    args: [
      path.join(backendRoot, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--runInBand',
      '--runTestsByPath',
      'tests/api.test.js',
    ],
    cwd: backendRoot,
  },
  {
    name: 'cloud-restore-ui-smoke',
    command: process.execPath,
    args: [path.join(__dirname, 'cloudRestoreSuite.ui.cjs')],
    cwd: projectRoot,
  },
];

for (const item of commands) {
  const result = spawnSync(item.command, item.args, {
    stdio: 'inherit',
    cwd: item.cwd,
    shell: false,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(JSON.stringify({
  suite: 'cloud-verification',
  commands: commands.map((item) => item.name),
  success: true,
}));
