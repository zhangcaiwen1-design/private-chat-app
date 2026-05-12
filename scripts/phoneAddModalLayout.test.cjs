const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'Chat', 'ChatList.js'),
  'utf8',
);

test('phone add modal overlay uses centered content with vertical padding', () => {
  const overlayMatch = source.match(/modalOverlay:\s*\{([\s\S]*?)\},\s*centerModalContainer:/);
  assert.ok(overlayMatch, 'modalOverlay style should exist');
  const overlay = overlayMatch[1];

  assert.match(overlay, /justifyContent:\s*'center'/, 'modalOverlay should vertically center content');
  assert.match(overlay, /alignItems:\s*'center'/, 'modalOverlay should horizontally center content');
  assert.match(overlay, /paddingVertical:\s*24/, 'modalOverlay should keep vertical breathing room');
});
