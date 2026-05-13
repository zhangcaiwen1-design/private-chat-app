const MEMBERSHIP_PLANS = [
  {
    code: 'first_month_19_9',
    name: '首月体验',
    amount: 19.9,
    days: 30,
    bonusDays: 7,
    badge: '首购赠7天',
    summary: '限新用户首购，之后按标准月卡续费。',
    featured: true,
    visible: true,
  },
  {
    code: 'monthly_39_9',
    name: '尊享月卡',
    amount: 39.9,
    days: 30,
    bonusDays: 0,
    badge: '标准月卡',
    summary: '适合稳定使用，按月续费。',
    featured: false,
    visible: true,
  },
  {
    code: 'quarterly_99',
    name: '季卡',
    amount: 99,
    days: 90,
    bonusDays: 0,
    badge: '更省一点',
    summary: '一次开通三个月，适合中度使用。',
    featured: false,
    visible: true,
  },
  {
    code: 'annual_299',
    name: '年卡',
    amount: 299,
    days: 365,
    bonusDays: 0,
    badge: '长期最省',
    summary: '一年有效，平均月单价最低。',
    featured: false,
    visible: true,
  },
];

const LEGACY_PLANS = [
  {
    code: 'monthly_9_9',
    name: '旧月卡',
    amount: 9.9,
    days: 30,
    bonusDays: 0,
    badge: '历史套餐',
    summary: '兼容旧数据和历史订单。',
    featured: false,
    visible: false,
  },
];

const PLAN_MAP = new Map([...MEMBERSHIP_PLANS, ...LEGACY_PLANS].map((item) => [item.code, item]));
const DEFAULT_MEMBERSHIP_PLAN_CODE = 'first_month_19_9';

function clonePlan(plan) {
  if (!plan) {
    return null;
  }
  return {
    code: plan.code,
    name: plan.name,
    amount: plan.amount,
    days: plan.days,
    bonusDays: plan.bonusDays,
    badge: plan.badge,
    summary: plan.summary,
    featured: Boolean(plan.featured),
    visible: Boolean(plan.visible),
    displayAmount: `¥${plan.amount}`,
    cycleText: `/${plan.days}天`,
    totalDays: plan.days + (plan.bonusDays || 0),
  };
}

function getMembershipPlans() {
  return MEMBERSHIP_PLANS.map(clonePlan);
}

function resolveMembershipPlan(planCode) {
  const code = String(planCode || '').trim();
  if (!code) {
    return clonePlan(PLAN_MAP.get(DEFAULT_MEMBERSHIP_PLAN_CODE));
  }
  return clonePlan(PLAN_MAP.get(code)) || null;
}

function getMembershipPlanByCode(planCode) {
  return resolveMembershipPlan(planCode);
}

function getDefaultMembershipPlan() {
  return resolveMembershipPlan(DEFAULT_MEMBERSHIP_PLAN_CODE);
}

function getLegacyMonthlyPlan() {
  return resolveMembershipPlan('monthly_9_9');
}

function getPlanBonusDays(planCode, userHasPriorPaidMembership = false) {
  const plan = resolveMembershipPlan(planCode);
  if (!plan) {
    return 0;
  }
  if (plan.code === 'first_month_19_9' && userHasPriorPaidMembership) {
    return 0;
  }
  return Number(plan.bonusDays || 0);
}

function normalizePlanCode(planCode) {
  return resolveMembershipPlan(planCode)?.code || DEFAULT_MEMBERSHIP_PLAN_CODE;
}

module.exports = {
  DEFAULT_MEMBERSHIP_PLAN_CODE,
  LEGACY_PLANS,
  MEMBERSHIP_PLANS,
  getDefaultMembershipPlan,
  getLegacyMonthlyPlan,
  getMembershipPlanByCode,
  getMembershipPlans,
  getPlanBonusDays,
  normalizePlanCode,
  resolveMembershipPlan,
};
