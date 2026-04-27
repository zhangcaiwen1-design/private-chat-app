# 私密云聊天 API 设计文档

## 版本
v2.0 - 阿里云OSS存储 + 多用户隔离

---

## 技术架构

- **语言**: Node.js + Express
- **数据库**: 阿里云 RDS (MySQL)
- **文件存储**: 阿里云 OSS
- **加密**: AES-256 客户端加密
- **认证**: JWT Token

---

## 多用户隔离设计

每个用户的数据完全隔离：
- 用户A无法访问用户B的任何数据
- 云端文件名包含用户ID和随机字符串，防止猜测
- 所有API请求必须带有效Token，Token包含用户身份

---

## 数据库结构

### users 表
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  phone VARCHAR(20) UNIQUE NOT NULL,    -- 手机号
  password_hash VARCHAR(255) NOT NULL,   -- 密码哈希(bcrypt)
  name VARCHAR(50),                       -- 昵称
  avatar_url VARCHAR(500),                 -- 头像OSS地址
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
```

### contacts 表（双向好友关系）
```sql
CREATE TABLE contacts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,          -- 我方用户ID
  friend_id VARCHAR(36) NOT NULL,        -- 对方用户ID
  friend_name VARCHAR(50),               -- 备注名
  friend_phone VARCHAR(20),              -- 对方手机号
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (friend_id) REFERENCES users(id)
);
```

### messages 表
```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,          -- 所属用户
  contact_id VARCHAR(36) NOT NULL,        -- 关联联系人
  friend_id VARCHAR(36) NOT NULL,         -- 对方用户ID
  type ENUM('text','image','voice') NOT NULL,
  content TEXT NOT NULL,                  -- 加密后的内容
  is_cloud TINYINT(1) DEFAULT 0,         -- 是否云端备份
  cloud_url VARCHAR(500),                -- OSS文件地址(图片/语音)
  burn_after_read TINYINT(1) DEFAULT 0,  -- 是否阅后即焚
  burn_duration BIGINT,                  -- 销毁时间(毫秒)
  read_at BIGINT,                        -- 阅读时间
  created_at BIGINT NOT NULL,
  INDEX idx_user_contact (user_id, contact_id),
  INDEX idx_cloud (user_id, is_cloud),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### files 表（OSS文件元数据）
```sql
CREATE TABLE files (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  contact_id VARCHAR(36),               -- 可为空(独立云端文件)
  type ENUM('image','voice','other') NOT NULL,
  original_name VARCHAR(255),
  oss_key VARCHAR(500) NOT NULL,         -- OSS对象key
  oss_bucket VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## OSS 存储结构

```
private-chat-bucket/
└── users/
    └── {user_id}/
        ├── avatars/           # 用户头像
        │   └── {user_id}.jpg
        ├── images/             # 聊天图片
        │   └── {message_id}.jpg
        └── voices/            # 语音消息
            └── {message_id}.m4a
```

**安全措施：**
- OSS Bucket 设置为私有，禁止公开访问
- 所有文件访问通过签名URL，有效期15分钟
- 文件名使用UUID，防止路径猜测

---

## API 接口

### 认证

#### 1. 发送验证码
```
POST /api/v1/auth/send-code
Body: { "phone": "13800138000" }
Response: { "success": true, "expires_in": 300 }
```

#### 2. 验证登录
```
POST /api/v1/auth/login
Body: { "phone": "13800138000", "code": "123456" }
Response: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "phone": "13800138000",
    "name": "张三"
  }
}
```

#### 3. 退出登录
```
POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

---

### 用户

#### 4. 获取当前用户信息
```
GET /api/v1/user/me
Headers: Authorization: Bearer <token>
Response: { "user": {...} }
```

#### 5. 更新用户信息
```
PUT /api/v1/user/me
Headers: Authorization: Bearer <token>
Body: { "name": "新名字" }
Response: { "user": {...} }
```

#### 6. 获取我的二维码信息
```
GET /api/v1/user/qr
Headers: Authorization: Bearer <token>
Response: {
  "user_id": "xxx",
  "qr_code": "PRIVATE-{base64(userId:timestamp:signature)}"
}
```

#### 7. 上传头像
```
POST /api/v1/user/avatar
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file (图片, 最大2MB)
Response: { "avatar_url": "oss://..." }
```

---

### 联系人

#### 8. 获取联系人列表
```
GET /api/v1/contacts
Headers: Authorization: Bearer <token>
Response: {
  "contacts": [
    {
      "id": "xxx",
      "friend_id": "yyy",
      "friend_name": "李四",
      "friend_phone": "13900139000",
      "friend_avatar": "oss://..."
    }
  ]
}
```

#### 9. 添加联系人（手机号）
```
POST /api/v1/contacts
Headers: Authorization: Bearer <token>
Body: { "friend_phone": "13900139000", "friend_name": "李四" }
Response: { "contact": {...} }
```

#### 10. 通过二维码添加
```
POST /api/v1/contacts/qr-add
Headers: Authorization: Bearer <token>
Body: { "qr_code": "PRIVATE-xxxx" }
Response: { "contact": {...} }
```

#### 11. 删除联系人
```
DELETE /api/v1/contacts/:contactId
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

---

### 消息

#### 12. 发送消息
```
POST /api/v1/messages
Headers: Authorization: Bearer <token>
Body: {
  "contact_id": "xxx",
  "type": "text",
  "content": "加密后的内容",
  "burn_after_read": false,
  "burn_duration": null
}
Response: { "message": {...} }
```

#### 13. 获取聊天记录
```
GET /api/v1/messages/:contactId
Headers: Authorization: Bearer <token>
Query: ?limit=50&before=1234567890
Response: { "messages": [...], "has_more": true }
```

#### 14. 标记消息已读
```
POST /api/v1/messages/:messageId/read
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

#### 15. 删除消息（本地）
```
DELETE /api/v1/messages/:messageId
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

---

### 云端备份

#### 16. 上传消息/图片到云端备份
```
POST /api/v1/cloud/upload
Headers: Authorization: Bearer <token>
Body: {
  "contact_id": "xxx",
  "type": "text|image|voice",
  "content": "加密内容",
  "file_url": "oss://..."  // 图片/语音时必填
}
Response: {
  "cloud_id": "xxx",
  "cloud_url": "oss://..."
}
```

#### 17. 获取云端备份列表
```
GET /api/v1/cloud/messages
Headers: Authorization: Bearer <token>
Query: ?type=all|text|image|voice&limit=50&offset=0
Response: {
  "messages": [...],
  "total": 100
}
```

#### 18. 下载云端文件（获取签名URL）
```
GET /api/v1/cloud/file/:fileId
Headers: Authorization: Bearer <token>
Response: { "signed_url": "https://oss...&signature=xxx", "expires_in": 900 }
```

#### 19. 删除云端备份
```
DELETE /api/v1/cloud/:cloudId
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

---

### 文件上传

#### 20. 上传聊天图片
```
POST /api/v1/upload/image
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file (图片, 最大10MB)
Response: {
  "file_id": "xxx",
  "oss_key": "users/xxx/images/xxx.jpg",
  "thumbnail_url": "oss://..."
}
```

#### 21. 上传语音
```
POST /api/v1/upload/voice
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file (音频, 最大5MB)
Response: {
  "file_id": "xxx",
  "oss_key": "users/xxx/voices/xxx.m4a"
}
```

---

## 加密方案

### 客户端加密（重要！）
1. 用户首次注册时，服务器生成随机 `user_secret_key`
2. `user_secret_key` 用用户密码通过 PBKDF2 衍生
3. 所有消息内容在发送前用 `user_secret_key` + AES-256-CBC 加密
4. 服务器只存储密文，无法解密原文

### 文件加密
1. 图片/语音在上传前加密
2. 服务器存储加密后的文件
3. 下载时返回密文，客户端解密

---

## 安全措施

| 措施 | 说明 |
|------|------|
| JWT过期 | 7天 |
| 验证码有效期 | 5分钟 |
| 请求限流 | 60次/分钟 |
| 文件大小限制 | 图片10MB，语音5MB，头像2MB |
| OSS私有Bucket | 所有文件需签名访问 |
| 用户数据隔离 | 每条数据关联user_id，查询时强制过滤 |
| 二维码签名 | 带时间戳和签名防伪造 |

---

## 阿里云配置

```javascript
// 环境变量
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_BUCKET=private-chat-oss
OSS_REGION=cn-hangzhou
RDS_HOST=rm-xxx.mysql.aliyuncs.com
RDS_PORT=3306
RDS_DB=private_chat
RDS_USER=xxx
RDS_PASSWORD=xxx
```

---

## 部署架构

```
                    ┌─────────────────┐
                    │   阿里云 ECS    │
                    │   Node.js API   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  OSS Bucket│  │  RDS MySQL │  │   SMS    │
        │  (文件存储) │  │  (数据库)  │  │ (验证码) │
        └───────────┘  └───────────┘  └───────────┘
```

---

## 文件结构

```
backend/
├── server.js
├── config/
│   └── aliyun.js          # 阿里云配置
├── routes/
│   ├── auth.js
│   ├── user.js
│   ├── contacts.js
│   ├── messages.js
│   ├── cloud.js
│   └── upload.js
├── middleware/
│   └── auth.js            # JWT验证 + 用户隔离检查
├── services/
│   ├── oss.js             # 阿里云OSS操作
│   ├── mysql.js           # 数据库操作
│   └── sms.js             # 短信服务
├── utils/
│   └── crypto.js          # 加密工具
└── package.json
```

---

## 需要确认

1. **手机号登录还是用户名密码？** - 推荐手机号+验证码
2. **阅后即焚消息是否也要存云端？** - 可以存，但显示后倒计时删除
3. **需要语音通话功能吗？** - 超出MVP范围，但可以预留
4. **预算多少？** - 阿里云OSS+RDS大概50-100元/月