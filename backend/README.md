# 私密聊天 Backend API

基于阿里云的私密聊天应用后端服务。

## 技术栈

- Node.js + Express
- 阿里云 RDS MySQL
- 阿里云 OSS 对象存储
- JWT 认证

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

主要配置项：
- `JWT_SECRET` - JWT 密钥（生产环境务必修改）
- `OSS_*` - 阿里云 OSS 配置
- `RDS_*` - 阿里云 RDS MySQL 配置
- `SMS_*` - 阿里云短信配置（可选）

### 3. 启动服务

```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

## API 文档

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/auth/send-code` | 发送验证码 |
| POST | `/api/v1/auth/login` | 登录/注册 |
| POST | `/api/v1/auth/logout` | 退出登录 |

### 用户接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/user/me` | 获取当前用户信息 |
| PUT | `/api/v1/user/me` | 更新用户信息 |
| GET | `/api/v1/user/qr` | 获取二维码信息 |
| POST | `/api/v1/user/avatar` | 上传头像 |

### 联系人接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/contacts` | 获取联系人列表 |
| POST | `/api/v1/contacts` | 添加联系人 |
| POST | `/api/v1/contacts/qr-add` | 扫码添加联系人 |
| DELETE | `/api/v1/contacts/:id` | 删除联系人 |

### 消息接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/messages` | 发送消息 |
| GET | `/api/v1/messages/:contactId` | 获取聊天记录 |
| POST | `/api/v1/messages/:id/read` | 标记已读 |
| DELETE | `/api/v1/messages/:id` | 删除消息 |

### 云端备份接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/cloud/upload` | 上传到云端 |
| GET | `/api/v1/cloud/messages` | 获取云端备份列表 |
| GET | `/api/v1/cloud/file/:id` | 获取文件签名URL |
| DELETE | `/api/v1/cloud/:id` | 删除云端备份 |

### 文件上传接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/upload/image` | 上传聊天图片 |
| POST | `/api/v1/upload/voice` | 上传语音消息 |
| GET | `/api/v1/upload/url/:id` | 获取文件签名URL |

## 阿里云配置指南

### OSS Bucket 设置

1. 创建私有 Bucket
2. 设置 CORS 跨域规则
3. 配置生命周期规则（可选）

### RDS MySQL 设置

1. 创建 MySQL 实例
2. 创建数据库 `private_chat`
3. 创建用户并授权

### SMS 设置（可选）

1. 开通阿里云短信服务
2. 申请签名和模板
3. 配置 AccessKey

## 安全措施

- JWT Token 7天过期
- 验证码5分钟有效期
- 请求限流 60次/分钟
- 文件大小限制
- OSS 私有Bucket + 签名URL
- 用户数据完全隔离
