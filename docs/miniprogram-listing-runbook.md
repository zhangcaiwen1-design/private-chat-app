# 微信小程序上架准备说明

日期：2026-05-12

## 当前状态

- 已新增小程序工程目录：`miniprogram/`
- 已提供登录、隐私锁、会员中心、联系人、聊天、设置、协议页
- 后端仍使用生产接口：`https://privatechat.yifan1.com/api/v1`
- 会员中心已接入微信虚拟支付购买链路，支付成功后自动开通会员
- 当前上架路线：先注册个人小程序拿 AppID 跑通测试；等产品验证和收费确定后，再按微信公众平台规则做主体迁移/企业认证。
- request 合法域名已配置：`https://privatechat.yifan1.com`

## 导入步骤

1. 打开微信开发者工具。
2. 导入目录：`D:\coding\private-calculator-chat\miniprogram`
3. 当前 AppID 已配置为：`wx54ba54fb4d2b3aba`
4. 后端服务选 **不使用云服务**，因为当前项目已经有自建后端 `https://privatechat.yifan1.com/api/v1`。
5. 在公众平台配置合法域名：
   - 请求域名：`https://privatechat.yifan1.com`
6. 上传代码前，先在开发者工具里检查首页是否能正常进入：
   - `pages/auth/index`
   - `pages/lock/index`
   - `pages/membership/index`
   - `pages/chats/index`
   - `pages/chat/index`

## 上架建议

### 名称

不要只叫“计算器”。更稳妥的命名方向：

- 私密聊天助手
- 安心私聊空间
- 双人私密空间

### 简介

建议写成：

> 计算器风格的私密聊天空间，支持手机号登录、隐私锁、会员月卡、联系人管理和双人私聊。

### 审核说明

建议如实说明：

- 这是私密聊天工具，不是单纯计算器。
- 计算器页是隐私锁入口。
- 聊天、会员和协议页都能正常访问。
- 当前会员开通使用微信虚拟支付，支付成功后自动生效。

### 审核测试账号

准备一个能正常登录、并且已开通会员的测试手机号，避免审核人员卡在会员页。

## 当前 AppID

- `wx54ba54fb4d2b3aba`

## 需要你补的东西

- 小程序名称
- 公众平台类目
- 隐私政策链接
- 用户协议链接
- 会员服务协议链接

## 个人主体先行策略

- 个人主体优点：注册成本低，适合先拿 AppID、导入工程、真机预览和打磨审核路径。
- 个人主体限制：不适合作为正式收费主体，后续微信虚拟支付、企业认证、品牌经营仍建议切到企业或个体工商户主体。
- 后续升级口径：这一步更准确叫“小程序主体迁移/主体变更”，不是简单点一下升级；是否需要公证、认证费和资料，以微信公众平台后台当时提示为准。
- 如果你在注册过程中已经看到“打款 300”页面，通常说明你已经走进企业/认证分支了。先别付款，直接返回上一层或退出当前注册，重新走“个人主体”注册流程。

## 官方参考

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [网络请求 wx.request](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)
- [虚拟支付 wx.requestVirtualPayment](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html)
