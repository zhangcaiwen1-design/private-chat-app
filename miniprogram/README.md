# 私密聊天助手小程序端

这是微信原生小程序版本，默认连接生产 API：

```text
https://privatechat.yifan1.com/api/v1
```

## 本地预览

1. 打开微信开发者工具。
2. 导入当前目录：`D:\coding\private-calculator-chat\miniprogram`
3. 当前 AppID：`wx54ba54fb4d2b3aba`
4. 后端服务选 **不使用云服务**
5. 正式预览或上传前，在公众平台配置 request 合法域名：`https://privatechat.yifan1.com`

## 页面

- `pages/auth/index`：微信登录 + 本地解锁密码
- `pages/lock/index`：计算器隐私锁
- `pages/membership/index`：会员中心和微信虚拟支付购买
- `pages/chats/index`：联系人和好友申请
- `pages/chat/index`：聊天窗口和表情
- `pages/settings/index`：资料和本地密码
- `pages/agreement/index`：协议页

## 上架注意

上架时建议定位为“私密聊天工具”，不要只按普通计算器提交。计算器页在审核说明里解释为隐私锁入口。
