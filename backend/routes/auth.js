const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');
const { generateToken, hashPassword, comparePassword } = require('../middleware/auth');

// SMS verification code store (in production, use Redis)
const verificationCodes = new Map();

// Send verification code
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '请输入有效的手机号' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store code (in production, send SMS via Aliyun Dysms)
    verificationCodes.set(phone, { code, expiresAt });

    console.log(`[DEV] Verification code for ${phone}: ${code}`);

    // TODO: In production, call Aliyun SMS API:
    // await dysms.sendCode({ PhoneNumbers: phone, SignName: '私密聊天', TemplateCode: 'SMS_xxx', TemplateParam: { code } });

    res.json({
      success: true,
      expires_in: 300
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// Login with phone and verification code
router.post('/login', async (req, res) => {
  try {
    const { phone, code, password } = req.body;

    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '请输入有效的手机号' });
    }

    // Check if user exists
    const users = await query('SELECT * FROM users WHERE phone = ?', [phone]);
    let user = users[0];

    if (!user) {
      // New user - register
      if (!code && !password) {
        return res.status(400).json({ error: '新用户需要验证码或密码注册' });
      }

      // Verify code if provided
      if (code) {
        const stored = verificationCodes.get(phone);
        if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
          return res.status(400).json({ error: '验证码无效或已过期' });
        }
        verificationCodes.delete(phone);
      }

      // Create new user
      const id = uuidv4();
      const now = Date.now();
      const pwdHash = password ? await hashPassword(password) : await hashPassword(code);

      await query(
        'INSERT INTO users (id, phone, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, phone, pwdHash, now, now]
      );

      user = { id, phone, name: null, avatar_url: null };
    } else {
      // Existing user - verify password
      if (password) {
        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
          return res.status(401).json({ error: '密码错误' });
        }
      } else if (code) {
        // Verify code login for existing user
        const stored = verificationCodes.get(phone);
        if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
          return res.status(400).json({ error: '验证码无效或已过期' });
        }
        verificationCodes.delete(phone);
      } else {
        return res.status(400).json({ error: '请提供密码或验证码' });
      }
    }

    // Generate JWT token
    const token = generateToken(user.id, user.phone);

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // JWT is stateless, so logout is handled client-side
  // In production, you might blacklist the token in Redis
  res.json({ success: true });
});

module.exports = router;
