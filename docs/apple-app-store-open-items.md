# Apple 上架待补资料

更新时间：2026-06-13

## 需要用户提供

| 项目 | 当前状态 | 说明 |
|---|---|---|
| Apple Developer 账号 | 未确认 | 需要能登录 App Store Connect，并已加入 Apple Developer Program |
| 开发者主体名称 | 已确认 | 南京文晶科技有限公司 |
| 隐私政策 URL | 有本地草稿和构建脚本，缺公网链接 | 草稿在 `docs/site/privacy.html`，运行 `npm run site:build` 后发布 `dist-site/privacy.html` |
| 用户协议 URL | 有本地草稿和构建脚本，缺公网链接 | 草稿在 `docs/site/terms.html`，运行 `npm run site:build` 后发布 `dist-site/terms.html` |
| 客服邮箱/电话 | 已确认邮箱 | zhangcaiwen1@126.com |
| 审核测试手机号 | 缺失 | 需要一个审核员可直接登录的账号 |
| 测试进入密码 | 缺失 | iOS 首版默认不走计算器入口，但审核备注仍可提供本机锁密码 |
| 截图素材 | 缺失 | 至少准备 iPhone 6.7 英寸截图，建议 5-8 张 |

## 我可以继续处理

1. 起草隐私政策、用户协议、会员协议。
2. 做官网协议静态页。已生成 `docs/site/` 初版和 `npm run site:build` 构建脚本。
3. 生成 App Store 文案、关键词、审核备注。
4. 增加账号注销/数据删除说明页。
5. 做 iOS 截图脚本或手动截图流程。
6. 配置 EAS submit 的 Apple Team / ASC App ID。
7. 构建 TestFlight 包。

## 当前代码状态

- iOS App 展示名已改为“安心聊天”。
- iOS 首版关闭 iPad 支持。
- iOS 已补相机、相册、麦克风权限说明。
- iOS 首版不展示微信小程序购买入口。
- iOS 首版不把会员状态作为进入聊天的硬门槛。
- Android 原计算器入口和会员门槛逻辑保持。

## 提交前硬阻塞

1. 没有隐私政策 URL 不能提交。
2. 没有测试账号会影响审核。
3. 如果 iOS 版本里出现外部购买引导，可能被拒。
4. 如果 App Store 文案强调“伪装、隐藏、防查、规避”，可能被拒。
