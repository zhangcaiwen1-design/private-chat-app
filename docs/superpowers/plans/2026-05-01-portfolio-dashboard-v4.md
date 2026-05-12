# Portfolio Dashboard v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把项目组合总控台从 v2 升级到 v4，让用户每天打开总控台就知道哪个项目最接近赚钱、哪个事项最卡、哪些事能交给 Claude、哪些项目保持观察。

**Architecture:** 先把 v4 需要的轨道、优先级、每日四块内容落到 `docs/project-portfolio-data.json`，再让 `docs/master-project-dashboard.html` 从内嵌数据渲染这些字段，最后同步更新 `docs/project-portfolio-workflow.md`。本轮只做本地文档型总控台，不接入远程服务、不上传 GitHub、不自动联系客户、不自动判断现实事项完成。

**Tech Stack:** 静态 HTML、原生 JavaScript、JSON、Markdown、Python JSON 校验、Expo lint。

---

## File Structure

- Modify: `docs/project-portfolio-data.json`
  - 责任：保存项目组合 v4 的结构化数据，包括生命周期轨道、混合优先级、下一步最小动作、每日四块内容、Claude 可推进事项、观察项目。
- Modify: `docs/master-project-dashboard.html`
  - 责任：渲染项目组合总控台 v4 首页，显示每日四块内容、项目卡片轨道、P0/P1/P2、项目详情和标准生产线。
- Modify: `docs/project-portfolio-workflow.md`
  - 责任：用文字记录 v4 工作流，说明五条轨道、每日四块、混合优先级和不自动处理现实事项的边界。
- Reference only: `docs/superpowers/specs/2026-05-01-portfolio-dashboard-v4-design.md`
  - 责任：v4 设计依据，不在实施中修改。
- Reference only: `docs/project-progress-snapshot.json`
  - 责任：自动扫描快照。实施中不让它覆盖人工现实进度。
- Reference only: `docs/manual-progress-log.json`
  - 责任：人工现实事项记录。实施中只读取语义，不自动改成已完成。

## Task List

### Task 1: Add v4 portfolio data fields

**Files:**
- Modify: `D:/coding/private-calculator-chat/docs/project-portfolio-data.json`
- Reference: `D:/coding/private-calculator-chat/docs/superpowers/specs/2026-05-01-portfolio-dashboard-v4-design.md`

- [ ] **Step 1: Validate current JSON before editing**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/project-portfolio-data.json" >/dev/null
```

Expected: command exits with code 0 and prints nothing.

- [ ] **Step 2: Update top-level metadata and dashboard sections**

Change the beginning of `docs/project-portfolio-data.json` to include v4 metadata and daily sections while preserving the existing `philosophy`, `scoreDimensions`, and `projects` shape:

```json
{
  "version": 4,
  "updatedAt": "2026-05-01",
  "dashboardMode": "portfolio-lifecycle-v4",
  "dailyDashboard": {
    "moneyProject": {
      "title": "今天最该赚钱的项目",
      "projectId": "frozen-order",
      "summary": "冻品开单助手开发已较完整，下一步是找真实冻品批发用户试用、推广、上架和收费验证。",
      "nextAction": "设计首批真实用户试用推广方案，并准备同行微信群或熟人渠道触达文案。"
    },
    "blockedItem": {
      "title": "今天最卡住的事项",
      "projectId": "private-chat",
      "summary": "私密聊天助手的公司主体、经营范围、域名主体、软著名称和备案材料会影响后续上架。",
      "requiresUserAction": true,
      "nextAction": "用户本人继续推进公司名称、经营范围、软著名称和域名主体确认。"
    },
    "claudeTasks": {
      "title": "今天可以交给 Claude 的事项",
      "items": [
        { "projectId": "private-chat", "text": "起草隐私政策、用户协议、会员协议、软著说明、商店文案、权限说明、SDK 清单和截图脚本。" },
        { "projectId": "frozen-order", "text": "生成推广话术、试用流程、同行微信群邀请文案、上架材料和客户反馈表。" },
        { "projectId": "golden-idea", "text": "把已跑过的真实项目流程沉淀成模板、评分器和总控台模块。" }
      ]
    },
    "watchProjects": {
      "title": "今天保持观察的项目",
      "items": [
        { "projectId": "ai-girlfriend", "text": "继续补痛点雷达、合规边界和 MVP 候选。" },
        { "projectId": "tianyuan", "text": "继续补本地交友征婚的目标用户、真实性机制、线下获客和合规风险。" },
        { "projectId": "golden-idea", "text": "从真实项目中沉淀，不急着独立产品化。" }
      ]
    }
  },
```

- [ ] **Step 3: Add lifecycle track definitions**

Add this top-level array after `workflowModules`:

```json
  "lifecycleTracks": [
    {
      "id": "opportunity",
      "name": "机会轨",
      "purpose": "判断项目值不值得进入 MVP。",
      "outputs": ["痛点雷达卡", "10 维项目评分", "目标人群定义", "MVP 候选方案", "合规风险判断", "下一步验证动作"]
    },
    {
      "id": "mvp",
      "name": "MVP 轨",
      "purpose": "把想法做成可以演示、可以试用、可以收费验证的最小版本。",
      "outputs": ["核心功能闭环", "15 秒演示路径", "会员价值点", "付费入口", "赠送/邀请机制", "当前版本可测试清单"]
    },
    {
      "id": "compliance",
      "name": "上架合规轨",
      "purpose": "把项目从本地能跑推进到能提交平台审核。",
      "outputs": ["公司主体状态", "经营范围状态", "域名和备案状态", "软著名称与材料", "协议文档", "权限清单", "SDK 清单", "商店文案", "审核反馈记录"]
    },
    {
      "id": "promotion",
      "name": "推广验证轨",
      "purpose": "让真实用户看到、试用、咨询、付费或反馈。",
      "outputs": ["目标渠道清单", "私域/微信群试用方案", "电商平台素材", "短视频脚本", "询单话术", "试用反馈表", "成交和留存记录"]
    },
    {
      "id": "productization",
      "name": "产品化轨",
      "purpose": "把内部跑通的爆款 APP 生产流程沉淀成可复用、可展示、未来可对外销售的产品。",
      "outputs": ["标准模板", "项目评分器", "痛点雷达表", "阶段工作流", "总控台看板", "案例库", "对外产品定位"]
    }
  ],
```

- [ ] **Step 4: Update each project with v4 fields**

For each object in `projects`, add these fields and update the old `stage`, `priority`, `currentFocus`, and `blockers` values to match:

```json
{
  "id": "frozen-order",
  "stage": "推广验证轨 + 上架合规轨",
  "priority": "P0",
  "tracks": ["promotion", "compliance"],
  "nextSmallAction": "设计试用推广方案，准备首批真实用户触达。",
  "moneyDistance": "最近",
  "requiresUserAction": false,
  "claudeCanAdvance": true,
  "currentFocus": "进入真实试用和推广验证，不继续只在代码层打磨。",
  "blockers": ["需要首批真实冻品批发用户试用", "需要准备推广话术、试用流程和反馈表"]
}
```

```json
{
  "id": "private-chat",
  "stage": "MVP 轨 + 上架合规轨",
  "priority": "P0",
  "tracks": ["mvp", "compliance"],
  "nextSmallAction": "继续 MVP 打磨，推进公司主体、软著、域名和协议。",
  "moneyDistance": "较近",
  "requiresUserAction": true,
  "claudeCanAdvance": true,
  "currentFocus": "打磨计算器入口、微信式聊天、一键锁回、9.9 元/月和赠送 TA 月卡的商业演示闭环。",
  "blockers": ["公司名称和经营范围尚未完成变更", "yifan1.com 为个人名义购买，主体一致性待确认", "软著名称、备案材料和协议文档待推进"]
}
```

```json
{
  "id": "golden-idea",
  "stage": "产品化轨",
  "priority": "P1/P2",
  "tracks": ["productization"],
  "nextSmallAction": "从真实项目沉淀模板和总控台，不急于独立开发。",
  "moneyDistance": "中期",
  "requiresUserAction": false,
  "claudeCanAdvance": true,
  "currentFocus": "从冻品开单助手、私密聊天助手、AI 女友、天缘的真实推进过程里长出来。",
  "blockers": ["需继续用内部真实项目验证流程", "不应脱离真实项目空转"]
}
```

```json
{
  "id": "ai-girlfriend",
  "stage": "机会轨",
  "priority": "P2",
  "tracks": ["opportunity"],
  "nextSmallAction": "补痛点雷达、目标人群、合规边界。",
  "moneyDistance": "观察",
  "requiresUserAction": false,
  "claudeCanAdvance": true,
  "currentFocus": "继续补痛点雷达、合规边界和 MVP 候选。",
  "blockers": ["合规边界待定义", "目标人群和 MVP 候选待聚焦"]
}
```

```json
{
  "id": "tianyuan",
  "stage": "机会轨",
  "priority": "P2",
  "tracks": ["opportunity"],
  "nextSmallAction": "补本地用户画像、真实性机制、线下获客路径。",
  "moneyDistance": "观察",
  "requiresUserAction": false,
  "claudeCanAdvance": true,
  "currentFocus": "继续补本地交友征婚的目标用户、真实性机制、线下获客和合规风险。",
  "blockers": ["真实性和风控机制待设计", "合规和内容审核风险较高"]
}
```

Keep the existing `summary`, `founderFit`, `subflows`, and `scores` fields unless a value directly contradicts v4.

- [ ] **Step 5: Validate JSON after editing**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/project-portfolio-data.json" >/dev/null
```

Expected: command exits with code 0 and prints nothing.

- [ ] **Step 6: Verify required v4 data is present**

Run:

```bash
python - <<'PY'
import json
from pathlib import Path
p = Path('D:/coding/private-calculator-chat/docs/project-portfolio-data.json')
data = json.loads(p.read_text(encoding='utf-8'))
assert data['version'] == 4
assert 'dailyDashboard' in data
assert 'lifecycleTracks' in data
projects = {project['id']: project for project in data['projects']}
assert projects['frozen-order']['priority'] == 'P0'
assert projects['private-chat']['requiresUserAction'] is True
assert projects['golden-idea']['tracks'] == ['productization']
assert projects['ai-girlfriend']['priority'] == 'P2'
assert projects['tianyuan']['stage'] == '机会轨'
print('v4 portfolio data OK')
PY
```

Expected:

```text
v4 portfolio data OK
```

- [ ] **Step 7: Commit data update**

Run:

```bash
git -C "D:/coding/private-calculator-chat" status --short
git -C "D:/coding/private-calculator-chat" add "docs/project-portfolio-data.json"
git -C "D:/coding/private-calculator-chat" commit -m "feat: add portfolio dashboard v4 data"
```

Expected: commit succeeds and includes only `docs/project-portfolio-data.json`.

### Task 2: Render v4 daily dashboard in HTML

**Files:**
- Modify: `D:/coding/private-calculator-chat/docs/master-project-dashboard.html`
- Reference: `D:/coding/private-calculator-chat/docs/project-portfolio-data.json`

- [ ] **Step 1: Check current v2 title exists before editing**

Run:

```bash
python - <<'PY'
from pathlib import Path
p = Path('D:/coding/private-calculator-chat/docs/master-project-dashboard.html')
text = p.read_text(encoding='utf-8')
assert '项目组合总控台 v2' in text
assert 'todayList' in text
print('current dashboard baseline OK')
PY
```

Expected:

```text
current dashboard baseline OK
```

- [ ] **Step 2: Update document title and hero copy**

Change these strings in `docs/master-project-dashboard.html`:

```html
<title>项目组合总控台 v4</title>
```

```html
<span class="eyebrow">爆款 APP 生产工作流 · 项目组合总控台 v4</span>
<h1>多项目并行不是平均用力，而是每天推进最该动的一步。</h1>
```

- [ ] **Step 3: Replace the single today card with four v4 blocks**

Replace the existing card content:

```html
<div class="label">今天建议优先推进</div>
<div class="today" id="todayList"></div>
```

with:

```html
<div class="label">每日四块</div>
<div class="today daily" id="dailyDashboard"></div>
```

- [ ] **Step 4: Add compact styles for track and action rows**

In the existing `<style>` block, add these class rules before the media queries:

```css
.daily div{display:grid;gap:6px}.daily small{color:var(--muted);line-height:1.55}.track{background:rgba(118,82,166,.12);color:var(--violet)}.money{background:rgba(47,125,99,.12);color:var(--green)}.actionline{margin-top:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.5);color:var(--muted);line-height:1.55}.flags{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
```

- [ ] **Step 5: Update embedded data to match v4 JSON**

Replace the current `const data = { ... };` object with the full v4 object from `docs/project-portfolio-data.json`. Keep it as a JavaScript object literal, not a fetch call, so the local `file:///` dashboard works without a server.

The top of the embedded object must start like this:

```js
const data = {
  version: 4,
  updatedAt: '2026-05-01',
  dashboardMode: 'portfolio-lifecycle-v4',
```

- [ ] **Step 6: Replace `renderToday` with `renderDailyDashboard`**

Replace this call in `render()`:

```js
renderToday();
```

with:

```js
renderDailyDashboard();
```

Replace the whole `renderToday` function with:

```js
function projectName(id){const p=data.projects.find(x=>x.id===id);return p?p.name:id}
function renderDailyDashboard(){const d=data.dailyDashboard;document.getElementById('dailyDashboard').innerHTML=`<div><span class="pill money">${d.moneyProject.title}</span><b>${projectName(d.moneyProject.projectId)}</b><small>${d.moneyProject.summary}</small><small><b>下一步：</b>${d.moneyProject.nextAction}</small></div><div><span class="pill warn">${d.blockedItem.title}</span><b>${projectName(d.blockedItem.projectId)}</b><small>${d.blockedItem.summary}</small><small><b>下一步：</b>${d.blockedItem.nextAction}</small></div><div><span class="pill p1">${d.claudeTasks.title}</span>${d.claudeTasks.items.map(item=>`<small><b>${projectName(item.projectId)}：</b>${item.text}</small>`).join('')}</div><div><span class="pill p2">${d.watchProjects.title}</span>${d.watchProjects.items.map(item=>`<small><b>${projectName(item.projectId)}：</b>${item.text}</small>`).join('')}</div>`}
```

- [ ] **Step 7: Update project cards to show lifecycle tracks and next action**

Replace `renderProjects()` with:

```js
function trackNames(project){return (project.tracks||[]).map(id=>{const t=data.lifecycleTracks.find(x=>x.id===id);return t?t.name:id})}
function renderProjects(){document.getElementById('projectGrid').innerHTML=data.projects.map(p=>`<article class="project ${p.id===selectedId?'active':''}" onclick="selectProject('${p.id}')"><span class="pill ${priorityClass(p.priority)}">${p.priority}</span><h2>${p.name}</h2><p>${p.summary}</p><div class="meta"><span class="pill p2">${p.category}</span><span class="pill ok">均分 ${avgScore(p)}</span>${trackNames(p).map(name=>`<span class="pill track">${name}</span>`).join('')}</div><div class="progress"><span style="width:${projectProgress(p)}%"></span></div><div class="actionline"><b>下一步：</b>${p.nextSmallAction||p.currentFocus}</div><div class="actions">${p.subflows.map(s=>`<a class="btn" href="${s.href}" onclick="event.stopPropagation()">${s.name}</a>`).join('') || '<span class="btn">子工作流待创建</span>'}</div></article>`).join('')}
```

- [ ] **Step 8: Update project detail to show manual/Claude flags**

Replace `renderDetail()` with:

```js
function renderDetail(){const p=data.projects.find(x=>x.id===selectedId);document.getElementById('detailTitle').textContent=p.name+' · 项目详情';document.getElementById('projectDetail').innerHTML=`<b>${p.stage}</b><p>${p.summary}</p><div class="flags"><span class="pill ${p.requiresUserAction?'warn':'ok'}">${p.requiresUserAction?'需要用户本人处理':'暂无用户本人阻塞'}</span><span class="pill ${p.claudeCanAdvance?'ok':'p2'}">${p.claudeCanAdvance?'Claude 可推进':'Claude 仅观察'}</span><span class="pill money">离赚钱：${p.moneyDistance||'待判断'}</span></div><p><b>创始人熟悉度：</b>${p.founderFit}</p><p><b>当前重点：</b>${p.currentFocus}</p><p><b>下一步最小动作：</b>${p.nextSmallAction||p.currentFocus}</p><p><b>阻塞点：</b></p><ul>${p.blockers.map(b=>`<li>${b}</li>`).join('')}</ul>`;document.getElementById('scoreList').innerHTML=data.scoreDimensions.map(([id,name])=>{const v=p.scores[id];return `<div class="score-row"><span>${name}</span><div class="scorebar"><span style="width:${v*10}%"></span></div><b>${v}</b></div>`}).join('')}
```

- [ ] **Step 9: Update workflow modules to render five lifecycle tracks**

Replace `renderModules()` with:

```js
function renderModules(){document.getElementById('workflowModules').innerHTML=data.lifecycleTracks.map((track,i)=>`<div class="module"><b>${i+1}. ${track.name}</b><p class="sub">${track.purpose}</p><ul>${track.outputs.map(output=>`<li>${output}</li>`).join('')}</ul></div>`).join('')}
```

Change this section heading:

```html
<div class="section"><h3>五条项目轨道</h3><span class="sub">按生命周期分轨，不按项目名称平均用力</span></div>
```

- [ ] **Step 10: Verify required HTML text is present**

Run:

```bash
python - <<'PY'
from pathlib import Path
p = Path('D:/coding/private-calculator-chat/docs/master-project-dashboard.html')
text = p.read_text(encoding='utf-8')
required = [
    '项目组合总控台 v4',
    '每日四块',
    '今天最该赚钱的项目',
    '今天最卡住的事项',
    '今天可以交给 Claude 的事项',
    '今天保持观察的项目',
    '五条项目轨道',
    '推广验证轨',
    '产品化轨',
    '下一步最小动作',
]
missing = [item for item in required if item not in text]
assert not missing, missing
assert 'http://' not in text and 'https://' not in text
print('v4 dashboard HTML OK')
PY
```

Expected:

```text
v4 dashboard HTML OK
```

- [ ] **Step 11: Commit HTML update**

Run:

```bash
git -C "D:/coding/private-calculator-chat" status --short
git -C "D:/coding/private-calculator-chat" add "docs/master-project-dashboard.html"
git -C "D:/coding/private-calculator-chat" commit -m "feat: render portfolio dashboard v4"
```

Expected: commit succeeds and includes only `docs/master-project-dashboard.html`.

### Task 3: Document v4 workflow rules

**Files:**
- Modify: `D:/coding/private-calculator-chat/docs/project-portfolio-workflow.md`
- Reference: `D:/coding/private-calculator-chat/docs/superpowers/specs/2026-05-01-portfolio-dashboard-v4-design.md`

- [ ] **Step 1: Replace the workflow document with v4 content**

Rewrite `docs/project-portfolio-workflow.md` to this content:

```markdown
# 项目组合总控台 v4 工作流

日期：2026-05-01

## 1. 定位

项目组合总控台 v4 是“爆款 APP 生产工作流”的内部创业操作系统。

它不把所有项目排成一条队，而是按项目当前生命周期分轨推进。每天打开总控台，先判断哪个项目最接近赚钱、哪个事项最卡住、哪些工作可以交给 Claude、哪些项目只需保持观察。

## 2. 当前项目组合

| 项目 | 当前轨道 | 当前优先级 | 下一步最小动作 |
|---|---|---|---|
| 冻品开单助手 | 推广验证轨 + 上架合规轨 | P0 | 设计试用推广方案，准备首批真实用户触达 |
| 私密聊天助手 | MVP 轨 + 上架合规轨 | P0 | 继续 MVP 打磨，推进公司主体、软著、域名、协议 |
| 金点子 | 产品化轨 | P1/P2 | 从真实项目沉淀模板和总控台，不急于独立开发 |
| AI 女友 | 机会轨 | P2 | 补痛点雷达、目标人群、合规边界 |
| 天缘 | 机会轨 | P2 | 补本地用户画像、真实性机制、线下获客路径 |

## 3. 五条项目轨道

### 3.1 机会轨

用于判断项目值不值得进入 MVP。输出痛点雷达卡、10 维项目评分、目标人群定义、MVP 候选方案、合规风险判断和下一步验证动作。

当前适合：AI 女友、天缘。

### 3.2 MVP 轨

用于把想法做成可以演示、可以试用、可以收费验证的最小版本。输出核心功能闭环、15 秒演示路径、会员价值点、付费入口、赠送/邀请机制和当前版本可测试清单。

当前适合：私密聊天助手。

### 3.3 上架合规轨

用于把项目从本地能跑推进到能提交平台审核。输出公司主体状态、经营范围状态、域名和备案状态、软著名称与材料、隐私政策、用户协议、会员协议、权限清单、SDK 清单、商店文案、截图和测试账号。

当前适合：私密聊天助手、冻品开单助手。

### 3.4 推广验证轨

用于让真实用户看到、试用、咨询、付费或反馈。输出目标渠道清单、私域/微信群试用方案、电商平台素材、商品标题、主图卖点、短视频脚本、询单话术、试用反馈表、成交和留存记录。

当前优先：冻品开单助手。

### 3.5 产品化轨

用于把内部跑通的爆款 APP 生产流程沉淀成可复用、可展示、未来可对外销售的产品。输出标准模板、项目评分器、痛点雷达表、阶段工作流、总控台看板、案例库和对外产品定位。

当前适合：金点子。

## 4. 每日四块

每天打开总控台，先看四块内容：

1. 今天最该赚钱的项目：离推广、试用、成交、收费最近的项目。
2. 今天最卡住的事项：不处理就会挡住后续一串动作，尤其是用户本人必须处理的现实事项。
3. 今天可以交给 Claude 的事项：文档、整理、分析、素材和代码任务。
4. 今天保持观察的项目：需要保持活跃但不应抢 P0 注意力的项目。

## 5. 混合优先级规则

P0 满足任意条件即可进入：

1. 离收费、推广、真实试用最近。
2. 有用户本人必须处理的现实阻塞。
3. 有外部窗口期，例如预约、审核、客户咨询、试用机会。
4. 如果不处理，会拖住后续多个阶段。

P1 是 Claude 可以直接推进，且能为 P0 项目清路的事项。

P2 是保持活跃但不抢主线注意力的事项。

## 6. 自动进度和人工进度边界

自动进度来自 Git、文件、文档、脚本扫描和测试结果。它只能说明代码和文档状态。

人工进度来自用户确认，例如公司主体、经营范围、域名备案、软著、审核、客户试用、成交和退款。Claude 不能因为写了文档就判断现实事项已经完成。

## 7. 自然语言更新规则

用户可以直接告诉 Claude：

- “我完成了某某事项。”
- “某某事项被退回，原因是……”
- “我买了某个域名。”
- “我预约了某天办理某件事。”
- “某个项目暂缓。”

Claude 需要同步更新总控台数据、相关项目文档和必要记忆。现实世界动作仍然需要用户确认或亲自执行。

## 8. 不做什么

v4 不自动上传 GitHub，不自动部署，不自动提交应用商店，不自动联系客户或达人，不自动判断现实事项已经完成，不把所有项目强行排成同一个线性流程。
```

- [ ] **Step 2: Verify workflow document contains v4 sections**

Run:

```bash
python - <<'PY'
from pathlib import Path
p = Path('D:/coding/private-calculator-chat/docs/project-portfolio-workflow.md')
text = p.read_text(encoding='utf-8')
required = ['项目组合总控台 v4 工作流', '五条项目轨道', '每日四块', '混合优先级规则', '自动进度和人工进度边界', '不自动上传 GitHub']
missing = [item for item in required if item not in text]
assert not missing, missing
print('v4 workflow doc OK')
PY
```

Expected:

```text
v4 workflow doc OK
```

- [ ] **Step 3: Commit workflow doc update**

Run:

```bash
git -C "D:/coding/private-calculator-chat" status --short
git -C "D:/coding/private-calculator-chat" add "docs/project-portfolio-workflow.md"
git -C "D:/coding/private-calculator-chat" commit -m "docs: document portfolio dashboard v4 workflow"
```

Expected: commit succeeds and includes only `docs/project-portfolio-workflow.md`.

### Task 4: Verify dashboard v4 integration

**Files:**
- Verify: `D:/coding/private-calculator-chat/docs/project-portfolio-data.json`
- Verify: `D:/coding/private-calculator-chat/docs/master-project-dashboard.html`
- Verify: `D:/coding/private-calculator-chat/docs/project-portfolio-workflow.md`
- Verify: `D:/coding/private-calculator-chat/package.json`

- [ ] **Step 1: Run JSON validation**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/project-portfolio-data.json" >/dev/null
```

Expected: command exits with code 0 and prints nothing.

- [ ] **Step 2: Run cross-file v4 consistency check**

Run:

```bash
python - <<'PY'
import json
from pathlib import Path
root = Path('D:/coding/private-calculator-chat')
data = json.loads((root / 'docs/project-portfolio-data.json').read_text(encoding='utf-8'))
html = (root / 'docs/master-project-dashboard.html').read_text(encoding='utf-8')
workflow = (root / 'docs/project-portfolio-workflow.md').read_text(encoding='utf-8')
assert data['version'] == 4
for project_id in ['frozen-order', 'private-chat', 'golden-idea', 'ai-girlfriend', 'tianyuan']:
    assert project_id in html, project_id
for phrase in ['今天最该赚钱的项目', '今天最卡住的事项', '今天可以交给 Claude 的事项', '今天保持观察的项目']:
    assert phrase in html, phrase
    assert phrase in workflow, phrase
for track in ['机会轨', 'MVP 轨', '上架合规轨', '推广验证轨', '产品化轨']:
    assert track in html, track
    assert track in workflow, track
assert 'http://' not in html and 'https://' not in html
print('v4 cross-file consistency OK')
PY
```

Expected:

```text
v4 cross-file consistency OK
```

- [ ] **Step 3: Run lint as regression check**

Run:

```bash
npm --prefix "D:/coding/private-calculator-chat" run lint
```

Expected: command exits with code 0. Existing warnings may remain, but there must be 0 errors.

- [ ] **Step 4: Open local dashboard manually**

Run:

```bash
cmd.exe /c start "" "file:///D:/coding/private-calculator-chat/docs/master-project-dashboard.html"
```

Expected: browser opens the local dashboard. Visually verify:

- Header says `项目组合总控台 v4`.
- The hero card shows four blocks, not three sorted projects.
- 冻品开单助手 is P0 and shows 推广验证轨 + 上架合规轨.
- 私密聊天助手 is P0 and shows MVP 轨 + 上架合规轨.
- 金点子 shows 产品化轨 and does not抢 P0 注意力.
- AI 女友 and 天缘 show 机会轨 and P2.
- Project detail shows whether user action is required and whether Claude can advance it.

- [ ] **Step 5: Commit any verification-only fixes if needed**

If Steps 1-4 revealed a typo or rendering issue, fix it and commit only the affected files:

```bash
git -C "D:/coding/private-calculator-chat" status --short
git -C "D:/coding/private-calculator-chat" add "docs/project-portfolio-data.json" "docs/master-project-dashboard.html" "docs/project-portfolio-workflow.md"
git -C "D:/coding/private-calculator-chat" commit -m "fix: align portfolio dashboard v4 verification"
```

Expected: only run this commit if a fix was actually required. Do not create an empty commit.

### Task 5: Final review and handoff

**Files:**
- Review: `D:/coding/private-calculator-chat/docs/project-portfolio-data.json`
- Review: `D:/coding/private-calculator-chat/docs/master-project-dashboard.html`
- Review: `D:/coding/private-calculator-chat/docs/project-portfolio-workflow.md`
- Review: `D:/coding/private-calculator-chat/docs/superpowers/specs/2026-05-01-portfolio-dashboard-v4-design.md`

- [ ] **Step 1: Check working tree**

Run:

```bash
git -C "D:/coding/private-calculator-chat" status --short --branch
```

Expected: only intentional files are modified or the working tree is clean. No `.idea`, `.superpowers`, `.env`, database, keystore, or secret files should be staged.

- [ ] **Step 2: Compare implementation against v4 spec**

Run:

```bash
python - <<'PY'
from pathlib import Path
root = Path('D:/coding/private-calculator-chat')
spec = (root / 'docs/superpowers/specs/2026-05-01-portfolio-dashboard-v4-design.md').read_text(encoding='utf-8')
data = (root / 'docs/project-portfolio-data.json').read_text(encoding='utf-8')
html = (root / 'docs/master-project-dashboard.html').read_text(encoding='utf-8')
workflow = (root / 'docs/project-portfolio-workflow.md').read_text(encoding='utf-8')
requirements = [
    '今天最该赚钱的项目',
    '今天最卡住的事项',
    '今天可以交给 Claude 的事项',
    '今天保持观察的项目',
    '机会轨',
    'MVP 轨',
    '上架合规轨',
    '推广验证轨',
    '产品化轨',
    '冻品开单助手',
    '私密聊天助手',
    '金点子',
    'AI 女友',
    '天缘',
]
for requirement in requirements:
    assert requirement in spec, f'missing from spec: {requirement}'
    assert requirement in data or requirement in html or requirement in workflow, f'missing from implementation: {requirement}'
print('spec coverage check OK')
PY
```

Expected:

```text
spec coverage check OK
```

- [ ] **Step 3: Confirm no prohibited scope was added**

Run:

```bash
python - <<'PY'
from pathlib import Path
root = Path('D:/coding/private-calculator-chat')
changed = [
    root / 'docs/project-portfolio-data.json',
    root / 'docs/master-project-dashboard.html',
    root / 'docs/project-portfolio-workflow.md',
]
for path in changed:
    text = path.read_text(encoding='utf-8')
    forbidden = ['git push', 'gh pr create', '应用商店自动提交', '自动联系客户', '自动联系达人']
    found = [item for item in forbidden if item in text]
    assert not found, f'{path}: {found}'
print('scope boundary check OK')
PY
```

Expected:

```text
scope boundary check OK
```

- [ ] **Step 4: Report completion**

Report to the user:

```text
项目组合总控台 v4 已完成本地实现：数据文件、HTML 总控台、工作流文档已同步。验证结果：JSON 有效、v4 必要文案齐全、lint 无 error。没有上传 GitHub、没有部署、没有自动处理现实事项。
```

## Self-Review

- Spec coverage: v4 设计中的五条轨道、每日四块、混合优先级、当前项目分配、自动/人工边界和不做事项都映射到任务 1-5。
- Completeness scan: 本计划没有未完成步骤，所有代码、命令、预期输出和验证方式都已写明。
- Type consistency: 数据字段统一使用 `dailyDashboard`、`lifecycleTracks`、`tracks`、`nextSmallAction`、`moneyDistance`、`requiresUserAction`、`claudeCanAdvance`，HTML 任务引用同一组字段。
- Scope check: 本计划只实现本地总控台 v4，不包含 GitHub push、部署、应用商店提交、客户联系或现实事项自动完成判断。
