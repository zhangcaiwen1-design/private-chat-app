# 当前任务恢复交接记录

日期：2026-04-28

## 项目目录

`D:\coding\private-calculator-chat`

## 当前产品方向

正在把私密聊天 App 从原型推进到可商业展示的 MVP：

- 外层入口：像真实手机计算器，重点参考小米浅色计算器界面。
- 解锁方式：输入 PIN `EXPO_PUBLIC_APP_UNLOCK_PIN` 后按 `=` 进入私密聊天。
- 聊天体验：进入后尽量接近微信，降低用户学习成本。
- 隐私体验：少按钮、少设置，通过默认锁定/隐身/计算器伪装体现安全感。
- 商业化：目标是可用于咸鱼/淘宝/拼多多/抖音测试，月卡 `9.9 元/月`，支持“赠送 TA 月卡”的演示概念。

## 已完成内容

### 1. 软高级聊天 UI 初版已实现

已修改但尚未提交的文件：

- `src/components/Chat/ChatList.js`
- `src/components/Chat/ChatWindow.js`
- `src/components/Chat/MessageBubble.js`

这部分把原来的暗黑/黑金风格改成了更适合女性用户的暖色、柔和、高级感界面。

之前验证结果：

- `npm run lint`：无错误，有 7 个既有 warning。
- `npm test --prefix backend`：通过。
- `npx expo export --platform android`：通过。
- `npx expo export --platform web`：通过，仅有 expo-av deprecation warning。

### 2. 创新想法 backlog 已记录

文件：

- `docs/privacy-chat-innovation-backlog.md`

记录了后续增强方向：

- 无痕云端聊天。
- 双方同意的云端保险箱。
- 双方隐私契约。
- 暗号联系人。
- AI 隐私助手。
- 防截屏/截图提醒/一次性图片等。

当前原则：MVP 不堆太多功能，先做好微信式聊天体验和可信计算器伪装。

### 3. 商业化分析已记录

文件：

- `docs/commercialization-analysis.md`

记录了：

- `9.9 元/月` 单人月卡。
- 赠送好友/月卡机制。
- 咸鱼、淘宝、拼多多、抖音推广思路。
- 咸鱼竞品 6000+ 浏览量的市场验证信号。
- 合规定位：不要宣传成防查手机、出轨、违法规避工具，而是情侣/亲密关系私密沟通空间。

### 4. 商业 MVP 规格文档已完成

文件：

- `docs/superpowers/specs/2026-04-28-wechat-calculator-commercial-mvp-design.md`

核心范围：

1. 小米风格可信计算器入口。
2. 微信式聊天列表和聊天窗口。
3. 一键锁定/隐身回计算器。
4. `9.9 元/月` 会员价值展示。
5. `赠送 TA 月卡` 演示面。

明确排除：

- 真实支付。
- 真实云端存储。
- 防截屏系统实现。
- 暗号联系人。
- AI 隐私助手。
- 大账号系统/SMS 登录。

### 5. 商业 MVP 实施计划已完成

文件：

- `docs/superpowers/plans/2026-04-28-wechat-calculator-commercial-mvp.md`

计划包含 5 个任务：

1. 重设计 `src/components/Calculator/Calculator.js` 为小米风格浅色计算器。
2. 新增会员页和路由：
   - `src/utils/constants.js`
   - `src/App.js`
   - `src/components/Membership/MembershipPage.js`
3. 修改 `src/components/Chat/ChatList.js`，加入 `会员权益` 入口，并更接近微信列表。
4. 修改 `src/components/Chat/ChatWindow.js`，让文案和底部输入更接近微信。
5. 完整验证商业演示流程。

## 当前 git 状态

当前项目是 git 仓库，存在未提交改动：

```text
 M src/components/Chat/ChatList.js
 M src/components/Chat/ChatWindow.js
 M src/components/Chat/MessageBubble.js
?? docs/commercialization-analysis.md
?? docs/privacy-chat-innovation-backlog.md
?? docs/superpowers/plans/2026-04-28-soft-premium-chat-ui-mvp.md
?? docs/superpowers/plans/2026-04-28-wechat-calculator-commercial-mvp.md
?? docs/superpowers/specs/2026-04-28-wechat-calculator-commercial-mvp-design.md
```

没有按用户请求提交代码，所以这些改动仍未 commit。

## 下次恢复后建议直接做什么

推荐下一步：执行商业 MVP 实施计划。

可以对 Claude 说：

```text
继续执行 docs/superpowers/plans/2026-04-28-wechat-calculator-commercial-mvp.md，按 Subagent-Driven 方式实现。
```

如果想让当前会话内直接实现，可以说：

```text
按 docs/superpowers/plans/2026-04-28-wechat-calculator-commercial-mvp.md 直接开始实现。
```

## 恢复时需要注意

1. 不要重新做需求设计，规格和计划已经写好。
2. 不要引入真实支付、真实云端、账号系统、防截屏原生实现。
3. 会员/赠送月卡这次只做 UI 演示，不做支付闭环。
4. 计算器页面现在还是旧的暗黑 CASIO 风，需要优先改成浅色小米风。
5. 聊天页已经是软高级风，但还需要进一步靠近微信的结构和文案。
6. 实现完成后需要验证：
   - `npm run lint`
   - `npm test --prefix backend`
   - `npx expo export --platform android`
   - `npx expo export --platform web`
   - Expo Go 手机上完整演示流程。

## Expo/本地服务信息

之前可用信息：

- 后端端口：`3102`
- 手机访问 API：`http://YOUR_COMPUTER_LAN_IP:3102/api/v1`
- Expo 曾使用端口：`8083`
- Expo Go 地址曾是：`exp://YOUR_COMPUTER_LAN_IP:8083`

如果端口被占用，不要随意杀不确定进程；先检查占用情况，必要时换 Expo 端口。

## 商业演示目标流程

最终 MVP 应支持录制这段 15 秒左右的视频：

1. 打开 App，看起来是普通计算器。
2. 点几个计算器按键，证明能正常计算。
3. 输入 `EXPO_PUBLIC_APP_UNLOCK_PIN`，按 `=`。
4. 进入私密聊天列表。
5. 打开联系人并发送消息。
6. 一键锁定/隐身回计算器。
7. 再进入后打开会员页，展示 `9.9 元/月` 和 `赠送 TA 月卡`。

## 重要产品表达

推荐使用：

- 像微信一样好用，藏在计算器里的双人私密聊天空间。
- 有些话，只想安全地留给一个人。
- 给亲密关系一个更安心的沟通空间。

避免使用：

- 防查手机神器。
- 出轨聊天工具。
- 偷情工具。
- 躲老婆/躲对象。
- 违法规避工具。
