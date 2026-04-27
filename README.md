# 私密聊天 App

私密 2 人聊天应用，阅后即焚 + 云端备份。

## 技术栈

- **前端**: React Native (Expo)
- **后端**: Node.js + Express
- **数据库**: 阿里云 RDS MySQL
- **存储**: 阿里云 OSS

## 项目结构

```
PrivateChatApp/
├── app/                    # Expo Router 页面
├── src/
│   ├── components/         # React Native 组件
│   ├── services/           # API 服务
│   └── utils/              # 工具函数
├── backend/               # Node.js 后端
│   ├── routes/            # API 路由
│   ├── services/          # 数据库/OSS 服务
│   ├── middleware/       # 中间件
│   └── server.js         # 入口
└── docs/                  # 文档
```

## 开发

### 前端

```bash
npm install
npm start
```

### 后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入阿里云配置
npm run dev
```

## 部署

### 1. 创建 GitHub 仓库

将代码推送到 GitHub。

### 2. 配置 Secrets

在 GitHub 仓库 Settings > Secrets 中添加：

| Secret | 说明 |
|--------|------|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_PORT` | SSH 端口 (22) |
| `SERVER_USER` | 服务器用户名 |
| `SERVER_PASSWORD` | 服务器密码 |
| `JWT_SECRET` | JWT 密钥 |
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `OSS_BUCKET` | OSS Bucket 名称 |
| `OSS_REGION` | OSS 区域 |
| `RDS_HOST` | RDS MySQL 主机 |
| `RDS_DB` | 数据库名 |
| `RDS_USER` | 数据库用户名 |
| `RDS_PASSWORD` | 数据库密码 |

### 3. 服务器准备

```bash
# 创建目录
mkdir -p /home/admin/private-chat

# 确保 Node.js 18+ 已安装
node --version
```

### 4. 自动部署

推送代码到 master 分支即可自动部署。

部署后访问：`http://your-server:3001/health`

## API 文档

启动后端后访问：`http://localhost:3001/api/v1/`

## 功能

- [x] 计算器伪装壳
- [x] 生物识别解锁
- [x] 文本/图片/语音消息
- [x] 阅后即焚
- [x] 云端备份
- [x] 二维码添加联系人
- [x] 多用户数据隔离
