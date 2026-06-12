# Apple App Store 上架清单

更新时间：2026-06-13

## 当前策略

iOS 首版按普通私密聊天工具提交，不把“计算器伪装”作为 iOS 主入口，不展示微信小程序购买，不把会员作为进入聊天的硬门槛。后续如果要在 iOS 收费，需要接 Apple In-App Purchase 后再提交新版本。

## 项目配置

- App 名称：安心聊天
- Bundle ID：com.privatechatapp.calculator
- Expo owner：zhangcaiwen1
- EAS projectId：7fc4defb-8388-484a-bc2f-d70bf6e555d5
- iOS buildNumber：1.0.11
- iPad：首版关闭 `supportsTablet`，先只提交 iPhone

## 需要用户准备

1. Apple Developer Program 账号。
2. App Store Connect 登录权限。
3. 可公开访问的隐私政策 URL。
4. 可公开访问的用户协议 URL。
5. 客服邮箱或联系电话。
6. 审核测试手机号和测试进入密码。
7. 一个已能完整体验聊天能力的测试账号，最好已有至少一个联系人。

## App Store Connect 元数据建议

- App 名称：安心聊天
- 副标题：双人私密聊天与云端记录
- 分类：社交
- 年龄分级：按聊天和用户生成内容如实填写
- 关键词：聊天,私密聊天,双人聊天,语音消息,云端记录,联系人
- 简介：
  安心聊天是一款面向双人沟通的私密聊天工具，支持手机号登录、联系人管理、文字消息、图片消息、语音消息、二维码添加好友、聊天记录云端保存与恢复，以及本机锁定入口。

## 审核备注模板

请在 App Review Notes 中如实填写：

```text
This app is a private two-person chat app.

Test account:
Phone: <填写测试手机号>
Local entry password: <填写测试密码>

Main test flow:
1. Open the app.
2. Sign in with the test phone if needed.
3. Open the chat list.
4. Add a contact by phone or QR code.
5. Send text, image, and voice messages.
6. Use cloud records to save and restore chat data.

The iOS build does not use external payment. Membership purchase is not available on iOS in this version.
```

## 隐私标签初稿

需要在 App Store Connect 的 App Privacy 里按实际情况填写：

- Contact Info：手机号，用于登录和账号识别
- User Content：聊天文本、图片、语音、联系人备注，用于聊天和云端记录
- Identifiers：本机生成的 device id，用于登录态和设备识别
- Diagnostics：如后续接入崩溃/日志 SDK，需要补充

当前没有接入广告追踪，不应勾选 tracking。后续如接入统计、广告或第三方登录，要重新核对隐私标签。

## 权限说明

- Camera：扫描好友二维码；聊天中拍照发送图片
- Photo Library：选择图片并发送给聊天联系人
- Microphone：录制并发送语音消息
- Clipboard：复制用户 ID，不需要系统隐私弹窗文案

## 本地验证命令

```powershell
npm run lint
npm run site:build
```

审核测试路径见 `docs/apple-review-test-plan.md`。

## 协议页 URL 规划

把 `dist-site/` 部署到官网后，App Store Connect 使用这些链接：

- 官网：https://privatechat.yifan1.com/
- 隐私政策：https://privatechat.yifan1.com/privacy.html
- 用户协议：https://privatechat.yifan1.com/terms.html
- 账号注销说明：https://privatechat.yifan1.com/account-deletion.html

如果官网根目录还要保留 Android APK 下载页，可以改用：

- 隐私政策：https://privatechat.yifan1.com/legal/privacy.html
- 用户协议：https://privatechat.yifan1.com/legal/terms.html
- 账号注销说明：https://privatechat.yifan1.com/legal/account-deletion.html

最终采用哪个路径，要以服务器部署方式为准。

## EAS 构建与提交

```powershell
npx eas login
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

提交前必须确认 Apple Developer 账号、Bundle ID、证书、隐私政策 URL 和审核测试账号已经准备好。

## 当前风险

- App 仍然有 Android 计算器入口逻辑；iOS 代码已做平台分流，但审核备注不能宣称不存在任何锁定能力。
- 会员和支付能力在 Android/小程序侧存在；iOS 首版已隐藏外部购买入口。未来 iOS 收费必须接 Apple IAP。
- 隐私政策和用户协议还没有正式发布 URL，这是提交 App Store 前的硬阻塞。
