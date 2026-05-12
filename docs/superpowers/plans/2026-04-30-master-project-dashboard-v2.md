# 项目组合总控台 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the local project portfolio dashboard from a static overview into an interactive “爆款 APP 开发机器” v1 console that tracks five projects through pain radar, scoring, translation chain, and workflow status.

**Architecture:** Keep this as a local-first static HTML application with embedded JSON state and browser `localStorage`, matching the current dashboard approach. Do not introduce a backend, framework, build step, or cloud sync; keep the implementation portable and directly openable from a `file:///` URL.

**Tech Stack:** Plain HTML, CSS, vanilla JavaScript, browser `localStorage`, existing Markdown docs for durable project knowledge.

---

## File Structure

**Create:**
- `docs/project-portfolio-data.json` — Canonical seed data for the five projects, scoring dimensions, workflow modules, and channel categories. This makes the dashboard data model explicit and reusable.
- `docs/project-portfolio-workflow.md` — Human-readable workflow companion document that explains the portfolio hierarchy, scoring model, and daily operating routine.

**Modify:**
- `docs/master-project-dashboard.html` — Replace the v1 static dashboard with an interactive v2 dashboard that reads embedded seed data, persists edits in `localStorage`, displays project cards, scoring, next actions, and links to sub-workflows.
- `打开项目组合总控台.bat` — Keep pointing at `docs/master-project-dashboard.html`; no behavior change unless the path is wrong.

**Do not modify in this plan:**
- `docs/app-listing-dashboard.html` — Existing sub-workflow remains linked from 私密聊天助手.
- `docs/app-listing-compliance-progress.md` — Existing detailed listing workflow remains source material for the sub-workflow.
- React Native app source files — This plan is for workflow tooling only.

---

### Task 1: Create Portfolio Seed Data

**Files:**
- Create: `docs/project-portfolio-data.json`

- [ ] **Step 1: Create the seed data file**

Create `docs/project-portfolio-data.json` with exactly this content:

```json
{
  "version": 1,
  "updatedAt": "2026-04-30",
  "philosophy": {
    "headline": "不追风口，追真实痛点；像价值投资一样做 APP。",
    "principles": [
      "只在自己真正熟悉的行业、工作和生活场景里优先下注。",
      "任何类型的 APP 都可以做，关键看是否切中真实痛点。",
      "评分不是为了放弃项目，而是为了发现短板并持续优化。",
      "AI 降低边际成本，因此可以用项目组合方式长期复利。",
      "每个项目都要经历：真实需求 → 产品功能 → 对外话术 → 推广场景。"
    ]
  },
  "scoreDimensions": [
    { "id": "explicitPain", "name": "显性痛点", "description": "是否解决明确麻烦、低效、出错、重复劳动。" },
    { "id": "hiddenNeed", "name": "隐性需求", "description": "是否触及孤独、欲望、面子、焦虑、隐私、关系等不方便公开表达的需求。" },
    { "id": "frequency", "name": "频率", "description": "用户遇到问题的频率。" },
    { "id": "audienceClarity", "name": "人群清晰度", "description": "是否能一句话说清谁需要它。" },
    { "id": "solutionEffect", "name": "解决效果", "description": "App/AI 是否明显比现有办法更省事、更快、更爽。" },
    { "id": "paymentPotential", "name": "付费可能性", "description": "用户是否愿意为省事、省心、机会、陪伴、隐私付费。" },
    { "id": "acquisitionReach", "name": "获客可达性", "description": "目标用户是否有清晰渠道可触达。" },
    { "id": "mvpDifficulty", "name": "MVP 难度", "description": "能否用最小版本快速验证，分数越高代表越容易。" },
    { "id": "complianceSafety", "name": "合规安全", "description": "上架、支付、内容、隐私、行业监管风险是否可控，分数越高代表越安全。" },
    { "id": "founderFit", "name": "创始人熟悉度", "description": "是否来自用户亲身经历或熟悉领域。" }
  ],
  "workflowModules": [
    "创始人痛点雷达",
    "项目评分器",
    "痛点转译链",
    "MVP 工作流",
    "上架与合规",
    "AI 推广增长引擎",
    "数据复盘与自动优化"
  ],
  "projects": [
    {
      "id": "frozen-order",
      "name": "冻品开单助手",
      "category": "业务工具",
      "stage": "痛点雷达待完善",
      "priority": "P1",
      "summary": "面向冻品批发从业者的开单、客户、商品、订单效率工具。",
      "founderFit": "来自用户熟悉的家庭冻品批发生意和行业关系。",
      "currentFocus": "补齐痛点雷达卡：开单流程、同行痛点、现有替代方案、付费触发点。",
      "blockers": ["缺少完整痛点雷达卡", "缺少 MVP 核心路径确认"],
      "subflows": [],
      "scores": {
        "explicitPain": 8,
        "hiddenNeed": 3,
        "frequency": 8,
        "audienceClarity": 8,
        "solutionEffect": 7,
        "paymentPotential": 6,
        "acquisitionReach": 8,
        "mvpDifficulty": 7,
        "complianceSafety": 8,
        "founderFit": 9
      }
    },
    {
      "id": "ai-girlfriend",
      "name": "AI 女友",
      "category": "AI 情感产品",
      "stage": "痛点雷达待完善",
      "priority": "P1",
      "summary": "AI 陪伴、情绪价值、亲密互动和订阅付费方向。",
      "founderFit": "来自用户对中年情感、陪伴和欲望缺口的亲身理解。",
      "currentFocus": "拆分内部真实需求与对外合规定位，避免泛泛做陪伴。",
      "blockers": ["合规边界待定义", "MVP 场景待聚焦"],
      "subflows": [],
      "scores": {
        "explicitPain": 5,
        "hiddenNeed": 9,
        "frequency": 7,
        "audienceClarity": 6,
        "solutionEffect": 6,
        "paymentPotential": 8,
        "acquisitionReach": 6,
        "mvpDifficulty": 5,
        "complianceSafety": 4,
        "founderFit": 8
      }
    },
    {
      "id": "private-chat",
      "name": "私密聊天助手",
      "category": "隐私/亲密沟通",
      "stage": "MVP + 上架合规推进中",
      "priority": "P0",
      "summary": "计算器入口、双人私密聊天、会员月卡、赠送机制。",
      "founderFit": "来自用户对亲密沟通、隐私边界和情感需求的理解。",
      "currentFocus": "继续推进 MVP 打磨、公司主体变更、软著名称、协议草稿。",
      "blockers": ["公司名称和经营范围尚未完成变更", "yifan1.com 为个人名义购买，主体一致性待确认"],
      "subflows": [
        { "name": "上架合规子工作流", "href": "app-listing-dashboard.html" }
      ],
      "scores": {
        "explicitPain": 6,
        "hiddenNeed": 9,
        "frequency": 7,
        "audienceClarity": 7,
        "solutionEffect": 7,
        "paymentPotential": 8,
        "acquisitionReach": 6,
        "mvpDifficulty": 6,
        "complianceSafety": 4,
        "founderFit": 8
      }
    },
    {
      "id": "golden-idea",
      "name": "金点子",
      "category": "方法论产品",
      "stage": "概念成型",
      "priority": "P1",
      "summary": "从创意到 APP 变现的流程、模板、评分器和 AI 工作流系统。",
      "founderFit": "来自用户正在同时推进多个 APP 项目的真实需求。",
      "currentFocus": "沉淀爆款 APP 开发机器方法论，并先用于内部项目组合。",
      "blockers": ["需先用内部 5 个项目验证标准流程"],
      "subflows": [],
      "scores": {
        "explicitPain": 7,
        "hiddenNeed": 5,
        "frequency": 7,
        "audienceClarity": 6,
        "solutionEffect": 8,
        "paymentPotential": 7,
        "acquisitionReach": 6,
        "mvpDifficulty": 7,
        "complianceSafety": 8,
        "founderFit": 10
      }
    },
    {
      "id": "tianyuan",
      "name": "天缘",
      "category": "本地交友征婚平台",
      "stage": "痛点雷达待完善",
      "priority": "P1",
      "summary": "天长市本地交友征婚 App/小程序，偏同城严肃婚恋和中年再连接。",
      "founderFit": "来自用户对本地中年交友、婚恋、孤独和寻找知己需求的理解。",
      "currentFocus": "明确目标用户、真实性机制、线下获客和合规边界。",
      "blockers": ["真实性和风控机制待设计", "合规和内容审核风险较高"],
      "subflows": [],
      "scores": {
        "explicitPain": 6,
        "hiddenNeed": 9,
        "frequency": 6,
        "audienceClarity": 8,
        "solutionEffect": 6,
        "paymentPotential": 7,
        "acquisitionReach": 7,
        "mvpDifficulty": 4,
        "complianceSafety": 4,
        "founderFit": 8
      }
    }
  ]
}
```

- [ ] **Step 2: Validate JSON syntax**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/project-portfolio-data.json" > /tmp/project-portfolio-data.pretty.json
```

Expected: command exits with code 0 and prints no error.

- [ ] **Step 3: Commit**

```bash
git add "docs/project-portfolio-data.json"
git commit -m "docs: add project portfolio seed data"
```

---

### Task 2: Create Human-Readable Workflow Companion

**Files:**
- Create: `docs/project-portfolio-workflow.md`

- [ ] **Step 1: Write the workflow companion document**

Create `docs/project-portfolio-workflow.md` with exactly this content:

```markdown
# 项目组合总控台工作流

日期：2026-04-30

## 1. 定位

项目组合总控台是“爆款 APP 开发机器”的内部自用版本，用于同时统筹：

1. 冻品开单助手
2. AI 女友
3. 私密聊天助手
4. 金点子
5. 天缘

它不是普通任务列表，而是围绕真实痛点、创始人熟悉度、MVP、上架、推广、复盘建立的创业操作系统。

## 2. 每天打开后先看什么

每天先看三件事：

1. 哪个项目是 P0。
2. 哪些任务现在可推进。
3. 哪些阻塞必须由用户本人处理。

## 3. 单项目标准流程

每个项目都按这 7 层推进：

1. 创始人痛点雷达
2. 项目评分器
3. 痛点转译链
4. MVP 工作流
5. 上架与合规
6. AI 推广增长引擎
7. 数据复盘与自动优化

## 4. 评分维度

每个项目按 10 个维度打分：

1. 显性痛点
2. 隐性需求
3. 频率
4. 人群清晰度
5. 解决效果
6. 付费可能性
7. 获客可达性
8. MVP 难度
9. 合规安全
10. 创始人熟悉度

评分不是为了放弃项目，而是为了找到短板并持续优化。

## 5. 痛点转译链

每个项目都必须经过：

```text
真实需求 → 产品功能 → 对外话术 → 推广场景
```

内部真实需求可以讲透，外部表达必须合规、体面、清晰。

## 6. 自然语言更新规则

用户可以直接告诉 Claude：

- “我完成了某某事项。”
- “某某事项被退回，原因是……”
- “我买了某个域名。”
- “我预约了某天办理某件事。”
- “某个项目暂缓。”

Claude 需要同步更新：

1. 总控台 HTML。
2. 相关项目或子工作流文档。
3. 必要时更新长期记忆。

## 7. 当前主线

当前主线是：私密聊天助手。

当前子工作流是：上架与合规。

入口：`docs/app-listing-dashboard.html`
```

- [ ] **Step 2: Commit**

```bash
git add "docs/project-portfolio-workflow.md"
git commit -m "docs: document project portfolio workflow"
```

---

### Task 3: Replace Master Dashboard with Interactive v2

**Files:**
- Modify: `docs/master-project-dashboard.html`

- [ ] **Step 1: Replace the dashboard HTML**

Overwrite `docs/master-project-dashboard.html` with this complete file:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>项目组合总控台 v2</title>
  <style>
    :root{--ink:#191713;--muted:#746c60;--paper:#fffaf0;--line:#ddcbb2;--gold:#b66a14;--red:#b13d31;--green:#2f7d63;--blue:#386b9d;--violet:#7652a6;--shadow:0 24px 80px rgba(54,36,18,.16)}
    *{box-sizing:border-box}body{margin:0;color:var(--ink);font-family:"Microsoft YaHei","Noto Serif SC",serif;background:radial-gradient(circle at 8% -5%,rgba(246,176,75,.38),transparent 34rem),radial-gradient(circle at 90% 4%,rgba(56,107,157,.16),transparent 32rem),linear-gradient(135deg,#eed6b6,#fffaf0 50%,#ead5ba);min-height:100vh}.wrap{width:min(1500px,calc(100% - 32px));margin:auto;padding:30px 0 64px}.hero,.card,.project,.module{border:1px solid rgba(120,88,48,.2);background:rgba(255,250,240,.82);border-radius:30px;box-shadow:var(--shadow)}.hero{padding:30px;display:grid;grid-template-columns:1.08fr .92fr;gap:22px;position:relative;overflow:hidden}.hero:after{content:"PORTFOLIO\A MACHINE";white-space:pre;position:absolute;right:24px;top:18px;font:900 clamp(48px,8vw,112px)/.82 Georgia,serif;color:rgba(182,106,20,.07);letter-spacing:-.07em;text-align:right}.eyebrow{display:inline-block;border:1px solid rgba(182,106,20,.28);border-radius:999px;padding:8px 13px;color:var(--gold);font-weight:900;background:rgba(255,255,255,.45)}h1{font-size:clamp(34px,5.6vw,78px);line-height:.95;letter-spacing:-.08em;margin:16px 0 12px;position:relative}.sub{color:var(--muted);line-height:1.75;font-size:16px;position:relative}.card{padding:22px;position:relative}.label{font-size:13px;color:var(--muted);font-weight:900;letter-spacing:.12em;text-transform:uppercase}.today{display:grid;gap:10px;margin-top:12px}.today div{padding:13px;border:1px solid rgba(120,88,48,.15);border-radius:17px;background:#fffdf7}.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900}.p0{background:rgba(177,61,49,.1);color:var(--red)}.p1{background:rgba(182,106,20,.12);color:var(--gold)}.p2{background:rgba(56,107,157,.12);color:var(--blue)}.ok{background:rgba(47,125,99,.12);color:var(--green)}.warn{background:rgba(177,61,49,.1);color:var(--red)}.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}.btn{display:inline-flex;justify-content:center;text-decoration:none;color:var(--ink);font-weight:900;border:1px solid rgba(120,88,48,.22);border-radius:999px;padding:9px 12px;background:#fff9ef;cursor:pointer}.btn:hover{transform:translateY(-1px)}.grid{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:14px;margin-top:20px}.project{padding:18px;box-shadow:0 12px 38px rgba(54,36,18,.08)}.project.active{outline:3px solid rgba(182,106,20,.25)}.project h2{margin:10px 0 6px;font-size:24px;letter-spacing:-.04em}.project p{margin:0;color:var(--muted);line-height:1.55}.meta{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.progress{height:12px;border-radius:999px;background:#ead8c1;overflow:hidden}.progress span{display:block;height:100%;background:linear-gradient(90deg,var(--gold),#f2b45b)}.actions{display:grid;gap:8px;margin-top:14px}.section{display:flex;justify-content:space-between;align-items:end;margin:34px 0 14px}h3{font-size:34px;margin:0;letter-spacing:-.05em}.detail{display:grid;grid-template-columns:1fr 1fr;gap:14px}.module{padding:18px;box-shadow:0 12px 38px rgba(54,36,18,.08)}.module b{font-size:18px}.module ul{margin:12px 0 0;padding-left:20px;color:var(--muted);line-height:1.75}.score{display:grid;gap:9px}.score-row{display:grid;grid-template-columns:120px 1fr 36px;gap:10px;align-items:center}.scorebar{height:10px;border-radius:999px;background:#ead8c1;overflow:hidden}.scorebar span{display:block;height:100%;background:linear-gradient(90deg,var(--blue),#7fb0dd)}.note{margin-top:20px;padding:16px 18px;border-left:5px solid var(--gold);border-radius:18px;background:rgba(255,250,240,.78);color:var(--muted);line-height:1.7}@media(max-width:1150px){.grid{grid-template-columns:repeat(2,1fr)}.detail,.hero{grid-template-columns:1fr}}@media(max-width:650px){.grid{grid-template-columns:1fr}.wrap{width:min(100% - 20px,1500px)}}
  </style>
</head>
<body>
<div class="wrap">
  <section class="hero">
    <div>
      <span class="eyebrow">爆款 APP 开发机器 · 项目组合总控台 v2</span>
      <h1>从熟悉痛点出发，把五个项目跑成复利组合。</h1>
      <p class="sub" id="philosophyText">加载中...</p>
      <div class="toolbar">
        <button class="btn" onclick="selectProject('private-chat')">当前主线</button>
        <button class="btn" onclick="selectProject('golden-idea')">方法论产品</button>
        <a class="btn" href="project-portfolio-workflow.md">查看工作流文档</a>
        <a class="btn" href="app-listing-dashboard.html">私密聊天上架子工作流</a>
      </div>
    </div>
    <div class="card">
      <div class="label">今天建议优先推进</div>
      <div class="today" id="todayList"></div>
    </div>
  </section>

  <section class="grid" id="projectGrid"></section>

  <div class="section"><h3 id="detailTitle">项目详情</h3><span class="sub">痛点、评分、阻塞、下一步</span></div>
  <section class="detail">
    <div class="module" id="projectDetail"></div>
    <div class="module"><b>项目评分器</b><div class="score" id="scoreList"></div></div>
  </section>

  <div class="section"><h3>标准生产线</h3><span class="sub">每个项目都套同一套爆款 APP 开发流程</span></div>
  <section class="detail" id="workflowModules"></section>

  <div class="note"><b>自然语言更新规则：</b>你可以直接告诉 Claude “我完成了某某事项，结果是……”，Claude 需要同步更新总控台、对应子工作流和必要记忆。</div>
</div>
<script>
const data = {
  philosophy: {
    headline: '不追风口，追真实痛点；像价值投资一样做 APP。',
    principles: [
      '只在自己真正熟悉的行业、工作和生活场景里优先下注。',
      '任何类型的 APP 都可以做，关键看是否切中真实痛点。',
      '评分不是为了放弃项目，而是为了发现短板并持续优化。',
      'AI 降低边际成本，因此可以用项目组合方式长期复利。',
      '每个项目都要经历：真实需求 → 产品功能 → 对外话术 → 推广场景。'
    ]
  },
  scoreDimensions: [
    ['explicitPain','显性痛点'],['hiddenNeed','隐性需求'],['frequency','频率'],['audienceClarity','人群清晰度'],['solutionEffect','解决效果'],['paymentPotential','付费可能性'],['acquisitionReach','获客可达性'],['mvpDifficulty','MVP 难度'],['complianceSafety','合规安全'],['founderFit','创始人熟悉度']
  ],
  workflowModules: ['创始人痛点雷达','项目评分器','痛点转译链','MVP 工作流','上架与合规','AI 推广增长引擎','数据复盘与自动优化'],
  projects: [
    {id:'frozen-order',name:'冻品开单助手',category:'业务工具',stage:'痛点雷达待完善',priority:'P1',summary:'面向冻品批发从业者的开单、客户、商品、订单效率工具。',founderFit:'来自用户熟悉的家庭冻品批发生意和行业关系。',currentFocus:'补齐痛点雷达卡：开单流程、同行痛点、现有替代方案、付费触发点。',blockers:['缺少完整痛点雷达卡','缺少 MVP 核心路径确认'],subflows:[],scores:{explicitPain:8,hiddenNeed:3,frequency:8,audienceClarity:8,solutionEffect:7,paymentPotential:6,acquisitionReach:8,mvpDifficulty:7,complianceSafety:8,founderFit:9}},
    {id:'ai-girlfriend',name:'AI 女友',category:'AI 情感产品',stage:'痛点雷达待完善',priority:'P1',summary:'AI 陪伴、情绪价值、亲密互动和订阅付费方向。',founderFit:'来自用户对中年情感、陪伴和欲望缺口的亲身理解。',currentFocus:'拆分内部真实需求与对外合规定位，避免泛泛做陪伴。',blockers:['合规边界待定义','MVP 场景待聚焦'],subflows:[],scores:{explicitPain:5,hiddenNeed:9,frequency:7,audienceClarity:6,solutionEffect:6,paymentPotential:8,acquisitionReach:6,mvpDifficulty:5,complianceSafety:4,founderFit:8}},
    {id:'private-chat',name:'私密聊天助手',category:'隐私/亲密沟通',stage:'MVP + 上架合规推进中',priority:'P0',summary:'计算器入口、双人私密聊天、会员月卡、赠送机制。',founderFit:'来自用户对亲密沟通、隐私边界和情感需求的理解。',currentFocus:'继续推进 MVP 打磨、公司主体变更、软著名称、协议草稿。',blockers:['公司名称和经营范围尚未完成变更','yifan1.com 为个人名义购买，主体一致性待确认'],subflows:[{name:'上架合规子工作流',href:'app-listing-dashboard.html'}],scores:{explicitPain:6,hiddenNeed:9,frequency:7,audienceClarity:7,solutionEffect:7,paymentPotential:8,acquisitionReach:6,mvpDifficulty:6,complianceSafety:4,founderFit:8}},
    {id:'golden-idea',name:'金点子',category:'方法论产品',stage:'概念成型',priority:'P1',summary:'从创意到 APP 变现的流程、模板、评分器和 AI 工作流系统。',founderFit:'来自用户正在同时推进多个 APP 项目的真实需求。',currentFocus:'沉淀爆款 APP 开发机器方法论，并先用于内部项目组合。',blockers:['需先用内部 5 个项目验证标准流程'],subflows:[],scores:{explicitPain:7,hiddenNeed:5,frequency:7,audienceClarity:6,solutionEffect:8,paymentPotential:7,acquisitionReach:6,mvpDifficulty:7,complianceSafety:8,founderFit:10}},
    {id:'tianyuan',name:'天缘',category:'本地交友征婚平台',stage:'痛点雷达待完善',priority:'P1',summary:'天长市本地交友征婚 App/小程序，偏同城严肃婚恋和中年再连接。',founderFit:'来自用户对本地中年交友、婚恋、孤独和寻找知己需求的理解。',currentFocus:'明确目标用户、真实性机制、线下获客和合规边界。',blockers:['真实性和风控机制待设计','合规和内容审核风险较高'],subflows:[],scores:{explicitPain:6,hiddenNeed:9,frequency:6,audienceClarity:8,solutionEffect:6,paymentPotential:7,acquisitionReach:7,mvpDifficulty:4,complianceSafety:4,founderFit:8}}
  ]
};
let selectedId = localStorage.getItem('portfolio.selectedProject') || 'private-chat';
function avgScore(project){const vals=Object.values(project.scores);return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10}
function projectProgress(project){return Math.min(95, Math.round(avgScore(project)*8 + (project.priority === 'P0' ? 10 : 0)))}
function priorityClass(priority){return priority === 'P0' ? 'p0' : priority === 'P1' ? 'p1' : 'p2'}
function render(){document.getElementById('philosophyText').textContent=data.philosophy.headline+' '+data.philosophy.principles.join(' ');renderToday();renderProjects();renderDetail();renderModules()}
function renderToday(){const sorted=[...data.projects].sort((a,b)=>(a.priority>b.priority?1:-1)||avgScore(b)-avgScore(a));document.getElementById('todayList').innerHTML=sorted.slice(0,3).map(p=>`<div><span class="pill ${priorityClass(p.priority)}">${p.priority}</span> <b>${p.name}</b>：${p.currentFocus}</div>`).join('')}
function renderProjects(){document.getElementById('projectGrid').innerHTML=data.projects.map(p=>`<article class="project ${p.id===selectedId?'active':''}" onclick="selectProject('${p.id}')"><span class="pill ${priorityClass(p.priority)}">${p.priority}</span><h2>${p.name}</h2><p>${p.summary}</p><div class="meta"><span class="pill p2">${p.category}</span><span class="pill ok">均分 ${avgScore(p)}</span></div><div class="progress"><span style="width:${projectProgress(p)}%"></span></div><div class="actions">${p.subflows.map(s=>`<a class="btn" href="${s.href}" onclick="event.stopPropagation()">${s.name}</a>`).join('') || '<span class="btn">子工作流待创建</span>'}</div></article>`).join('')}
function renderDetail(){const p=data.projects.find(x=>x.id===selectedId);document.getElementById('detailTitle').textContent=p.name+' · 项目详情';document.getElementById('projectDetail').innerHTML=`<b>${p.stage}</b><p>${p.summary}</p><p><b>创始人熟悉度：</b>${p.founderFit}</p><p><b>当前重点：</b>${p.currentFocus}</p><p><b>阻塞点：</b></p><ul>${p.blockers.map(b=>`<li>${b}</li>`).join('')}</ul>`;document.getElementById('scoreList').innerHTML=data.scoreDimensions.map(([id,name])=>{const v=p.scores[id];return `<div class="score-row"><span>${name}</span><div class="scorebar"><span style="width:${v*10}%"></span></div><b>${v}</b></div>`}).join('')}
function renderModules(){document.getElementById('workflowModules').innerHTML=data.workflowModules.map((m,i)=>`<div class="module"><b>${i+1}. ${m}</b><ul><li>用于把项目从痛点推进到产品、推广和复盘。</li><li>后续可沉淀成金点子的标准模块。</li></ul></div>`).join('')}
function selectProject(id){selectedId=id;localStorage.setItem('portfolio.selectedProject',id);render()}
render();
</script>
</body>
</html>
```

- [ ] **Step 2: Open the dashboard manually**

Open:

```text
file:///D:/coding/private-calculator-chat/docs/master-project-dashboard.html
```

Expected: page loads, shows five project cards, clicking each card changes the detail pane and score bars.

- [ ] **Step 3: Verify sub-workflow link**

Click the `私密聊天助手` card, then click `上架合规子工作流`.

Expected: browser opens `docs/app-listing-dashboard.html`.

- [ ] **Step 4: Commit**

```bash
git add "docs/master-project-dashboard.html"
git commit -m "feat: upgrade portfolio dashboard"
```

---

### Task 4: Verify Quick Launcher

**Files:**
- Modify if needed: `打开项目组合总控台.bat`

- [ ] **Step 1: Inspect launcher content**

Open `打开项目组合总控台.bat` and verify it contains:

```bat
@echo off
start "" "file:///D:/coding/private-calculator-chat/docs/master-project-dashboard.html"
```

- [ ] **Step 2: Fix launcher if needed**

If the content differs, replace it with:

```bat
@echo off
start "" "file:///D:/coding/private-calculator-chat/docs/master-project-dashboard.html"
```

- [ ] **Step 3: Test launcher manually**

Double-click:

```text
D:\coding\private-calculator-chat\打开项目组合总控台.bat
```

Expected: browser opens the v2 portfolio dashboard.

- [ ] **Step 4: Commit if launcher changed**

Only run this if Step 2 changed the file:

```bash
git add "打开项目组合总控台.bat"
git commit -m "chore: update portfolio dashboard launcher"
```

---

### Task 5: Plan Self-Review Checklist for the Implementer

**Files:**
- Read: `docs/superpowers/specs/2026-04-30-hit-app-development-machine-design.md`
- Read: `docs/master-project-dashboard.html`
- Read: `docs/project-portfolio-workflow.md`

- [ ] **Step 1: Check spec coverage**

Verify the dashboard includes visible support for these spec concepts:

```text
- Five projects
- Pain-first philosophy
- Value-investing-like app development principle
- Score dimensions
- Pain translation chain as workflow module
- MVP workflow as workflow module
- Listing/compliance workflow as workflow module
- AI promotion growth engine as workflow module
- Data review and AI optimization as workflow module
- Private chat listing sub-workflow link
```

Expected: each concept appears in either the hero text, project cards, score panel, workflow modules, or sub-workflow link.

- [ ] **Step 2: Check local-first constraint**

Verify `docs/master-project-dashboard.html` does not import remote scripts, remote CSS, or require a build step.

Expected: no `<script src="https://...">`, no `<link href="https://...">`, no package manager command required.

- [ ] **Step 3: Check no unrelated app code changed**

Run:

```bash
git diff --stat
```

Expected: changes are limited to `docs/project-portfolio-data.json`, `docs/project-portfolio-workflow.md`, `docs/master-project-dashboard.html`, and optionally `打开项目组合总控台.bat`.

---

## Plan Self-Review

Spec coverage: The plan implements the requested “项目组合总控台 v2” slice of the approved spec, including the five projects, scoring dimensions, workflow modules, local-first dashboard, and existing private chat sub-workflow link. It intentionally does not implement all sub-workflows yet because the user selected option 1, and v1 scope says sub-workflows can be added later.

Placeholder scan: No TBD/TODO placeholders are present. All new file contents and commands are specified explicitly.

Type consistency: Project ids, score dimension ids, and subflow href values are consistent between the JSON seed data and dashboard implementation.
