# 微信小程序上架清单

日期：2026-05-12

## 建议提交信息

- 名称：私密聊天助手
- 简介：计算器风格的私密聊天空间，支持手机号登录、隐私锁、联系人管理和双人私聊
- 类目：先按工具/效率方向填，若平台要求再按实际审核意见调整
- 入口说明：计算器页是隐私锁入口，不是单独的计算器产品
- 当前主体路线：先用个人小程序测试，后续收费确定后再迁移到企业或个体工商户主体。

## 审核备注

建议如实写：

> 本产品为双人私密聊天工具，提供手机号登录、本地解锁密码、联系人管理、聊天、会员中心和协议页。会员中心使用微信虚拟支付购买套餐，支付成功后自动开通会员。

## 测试账号

- 手机号登录账号：准备 1 个可正常登录的手机号
- 会员账号：准备 1 个已开通会员的测试账号
- 本地解锁密码：准备一个便于审核输入的密码

## 当前 AppID

- `wx54ba54fb4d2b3aba`

## 域名

需要在小程序后台配置：

- request 合法域名：`https://privatechat.yifan1.com`，已配置。

## 上传前检查

- 首页能从 `pages/auth/index` 正常进入
- 隐私锁能通过本地密码解开
- 聊天列表能打开
- 聊天窗口能发文字和表情
- 协议页可以正常打开

## 官方链接

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [网络请求 wx.request](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)
- [虚拟支付 wx.requestVirtualPayment](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html)
