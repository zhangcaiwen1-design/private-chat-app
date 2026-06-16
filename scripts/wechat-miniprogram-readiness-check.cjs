const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const strictEnv = process.argv.includes('--strict-env');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function warn(message) {
  console.log(`WARN ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function getEnvValue(name) {
  const candidates = ['.env', 'backend/.env'];
  for (const file of candidates) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const line = fs
      .readFileSync(fullPath, 'utf8')
      .split(/\r?\n/)
      .find((item) => item.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim();
  }
  return process.env[name] || '';
}

function checkContains(file, pattern, message) {
  const content = read(file);
  if (typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content)) {
    pass(message);
    return;
  }
  fail(`${message} - ${file}`);
}

const projectConfig = JSON.parse(read('miniprogram/project.config.json'));
if (projectConfig.appid && projectConfig.appid !== 'touristappid') {
  pass(`Mini Program AppID exists - ${projectConfig.appid}`);
} else {
  fail('Mini Program AppID is missing');
}

checkContains('miniprogram/utils/constants.js', 'https://privatechat.yifan1.com/api/v1', 'Mini Program API base URL uses production HTTPS domain');
checkContains('miniprogram/pages/auth/index.js', 'wx.login', 'Auth page uses wx.login');
checkContains('miniprogram/pages/auth/index.js', 'api.wechatLogin', 'Auth page calls backend WeChat login');
checkContains('miniprogram/pages/auth/index.wxml', '微信登录', 'Auth page copy says WeChat login');
checkContains('miniprogram/pages/auth/index.wxml', '手机号不是登录必填项', 'Auth page states phone is not required for login');
checkContains('miniprogram/pages/settings/index.wxml', '绑定手机号（选填）', 'Settings page marks phone binding optional');

const miniFiles = [
  'miniprogram/pages/auth/index.js',
  'miniprogram/pages/auth/index.wxml',
  'miniprogram/pages/settings/index.wxml',
  'miniprogram/utils/api.js',
];
const hasGetPhoneNumber = miniFiles.some((file) => read(file).includes('getPhoneNumber'));
if (hasGetPhoneNumber) {
  fail('Mini Program still references getPhoneNumber');
} else {
  pass('Mini Program does not request getPhoneNumber');
}

checkContains('backend/routes/auth.js', "/wechat-login", 'Backend exposes WeChat login endpoint');
checkContains('backend/services/wechatVirtualPayment.js', 'jscode2session', 'Backend exchanges wx.login code with jscode2session');

if (exists('docs/wechat-phone-compliance-remediation.md')) {
  pass('WeChat phone compliance remediation doc exists');
} else {
  fail('WeChat phone compliance remediation doc is missing');
}

const appId = getEnvValue('WECHAT_MINIPROGRAM_APP_ID');
const appSecret = getEnvValue('WECHAT_MINIPROGRAM_APP_SECRET');

if (strictEnv) {
  if (appId) pass('WECHAT_MINIPROGRAM_APP_ID is configured');
  else fail('WECHAT_MINIPROGRAM_APP_ID is missing');

  if (appSecret) pass('WECHAT_MINIPROGRAM_APP_SECRET is configured');
  else fail('WECHAT_MINIPROGRAM_APP_SECRET is missing');
} else if (!appId || !appSecret) {
  warn('WeChat AppID/AppSecret env vars are not fully configured locally; use --strict-env before deployment');
} else {
  pass('WeChat AppID/AppSecret env vars are configured');
}
