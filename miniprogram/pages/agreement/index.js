const CONTENT = {
  privacy: {
    title: '隐私政策',
    sections: [
      '我们仅收集登录、聊天、会员开通所必需的数据。',
      '聊天内容用于为你和联系人提供消息服务与会员权益展示。',
      '我们使用设备标识、手机号和昵称帮助你完成登录、锁定与账号同步。',
      '如果你购买会员，支付订单信息仅用于开通会员、核对交易和处理售后。',
    ],
  },
  terms: {
    title: '用户协议',
    sections: [
      '本产品面向双人私密沟通与会员服务。',
      '你应保证提交信息真实有效，不得用于违法违规用途。',
      '账号和本地密码由你自行保管。',
      '服务内容、会员权益和功能会根据版本迭代更新。',
    ],
  },
  membership: {
    title: '会员服务协议',
    sections: [
      '会员当前首月体验价为 19.9 元 / 30 天，标准月卡为 39.9 元 / 30 天，另有季卡与年卡。',
      '小程序端支持微信虚拟支付购买，支付成功后会自动开通会员。',
      '开通成功后可使用完整聊天列表、联系人管理和聊天窗口。',
      '会员到期后服务会恢复到未开通状态。',
    ],
  },
};

Page({
  data: {
    title: '协议',
    sections: [],
  },

  onLoad: function (options) {
    const type = options.type || 'privacy';
    const content = CONTENT[type] || CONTENT.privacy;
    this.setData({
      title: content.title,
      sections: content.sections,
    });
    wx.setNavigationBarTitle({
      title: content.title,
    });
  },
});
