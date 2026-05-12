# Project Progress Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual-trigger dual-track progress sync system that scans local project repositories under `D:/coding`, records user-confirmed real-world progress, and displays both tracks in the portfolio dashboard.

**Architecture:** Implement this as local-first tooling with one Python scanner script, two JSON data files, and an updated static HTML dashboard. The scanner only reads safe project metadata and writes `docs/project-progress-snapshot.json`; user-confirmed real-world status lives separately in `docs/manual-progress-log.json` and is never overwritten by the scanner.

**Tech Stack:** Python 3 standard library, Git CLI, plain HTML/CSS/JavaScript, JSON, browser `localStorage` for selected dashboard project only.

---

## File Structure

**Create:**
- `scripts/update-project-dashboard.py` — Scans known `D:/coding` project directories, gathers git/doc/tech/test metadata, and writes `docs/project-progress-snapshot.json`.
- `docs/project-progress-snapshot.json` — Generated automatic development snapshot. Committed with an initial snapshot so the dashboard works without first running the script.
- `docs/manual-progress-log.json` — Manually maintained external progress log for real-world events like company changes, domain ownership, soft copyright, filings, app store review, store/promotion, and user/customer feedback.

**Modify:**
- `docs/master-project-dashboard.html` — Embed initial auto/manual data and display automatic development progress plus manual real-world progress for each project.
- `docs/project-portfolio-workflow.md` — Add the dual-track sync operating rules and the exact trigger phrase `更新项目总控台`.

**Do not modify:**
- Product app source files under `src/`.
- `docs/app-listing-dashboard.html` and `docs/app-listing-compliance-progress.md` except in a future plan specifically for sub-workflow synchronization.

---

### Task 1: Create Manual Progress Log

**Files:**
- Create: `docs/manual-progress-log.json`

- [ ] **Step 1: Create manual progress log**

Create `docs/manual-progress-log.json` with exactly this content:

```json
{
  "version": 1,
  "updatedAt": "2026-04-30",
  "items": [
    {
      "id": "manual-20260430-private-chat-domain-yifan1",
      "projectId": "private-chat",
      "projectName": "私密聊天助手",
      "module": "上架与合规",
      "item": "域名 yifan1.com",
      "status": "个人名义已购买",
      "date": "2026-04-30",
      "scheduledDate": null,
      "owner": "用户",
      "requiresUserAction": true,
      "isBlocking": true,
      "note": "用户说明 yifan1.com 是个人名义购买。后续如用于公司 App 上架、备案、协议页，需要确认是否转为公司主体实名/备案，或另购公司域名。",
      "nextAction": "新公司主体确定后，确认 yifan1.com 是否转公司实名/备案，或选择新的公司主体域名。"
    },
    {
      "id": "manual-20260430-private-chat-company-change",
      "projectId": "private-chat",
      "projectName": "私密聊天助手",
      "module": "上架与合规",
      "item": "公司名称变更和经营范围增项",
      "status": "已预约",
      "date": "2026-04-30",
      "scheduledDate": "2026-05-06",
      "owner": "用户",
      "requiresUserAction": true,
      "isBlocking": true,
      "note": "用户已预约 2026-05-06 让代账会计办理公司名称变更和经营范围增项。",
      "nextAction": "2026-05-06 后确认办理结果，并更新新营业执照信息。"
    }
  ]
}
```

- [ ] **Step 2: Validate JSON syntax**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/manual-progress-log.json" > /tmp/manual-progress-log.pretty.json
```

Expected: command exits with code 0 and prints no error.

- [ ] **Step 3: Commit**

```bash
git add "docs/manual-progress-log.json"
git commit -m "docs: add manual progress log"
```

---

### Task 2: Create Project Progress Scanner

**Files:**
- Create: `scripts/update-project-dashboard.py`
- Create: `docs/project-progress-snapshot.json` by running the script

- [ ] **Step 1: Create scanner script**

Create `scripts/update-project-dashboard.py` with exactly this content:

```python
#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from datetime import datetime
from pathlib import Path

ROOT = Path("D:/coding")
OUTPUT = Path("D:/coding/private-calculator-chat/docs/project-progress-snapshot.json")

PROJECTS = [
    {
        "projectId": "frozen-order",
        "name": "冻品开单助手 / autoErp",
        "path": ROOT / "autoErp",
    },
    {
        "projectId": "frozen-order-lite",
        "name": "冻品开单助手工作树",
        "path": ROOT / "frozen-order-assistant",
    },
    {
        "projectId": "ai-girlfriend",
        "name": "AI 女友",
        "path": ROOT / "autojqr",
    },
    {
        "projectId": "private-chat",
        "name": "私密聊天助手",
        "path": ROOT / "private-calculator-chat",
    },
]

SECRET_NAMES = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519"}
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".keystore", ".jks"}


def run_git(path: Path, args: list[str]) -> str:
    result = subprocess.run(
        ["git", "-C", str(path), *args],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def is_git_repo(path: Path) -> bool:
    return run_git(path, ["rev-parse", "--is-inside-work-tree"]) == "true"


def safe_file(path: Path) -> bool:
    name = path.name.lower()
    if name in SECRET_NAMES:
        return False
    if path.suffix.lower() in SECRET_SUFFIXES:
        return False
    if any(part in {"node_modules", ".git", ".gradle", "build", "dist"} for part in path.parts):
        return False
    return True


def count_docs(path: Path) -> dict:
    docs = path / "docs"
    if not docs.exists():
        return {"hasDocs": False, "hasSpecs": False, "hasPlans": False, "recentSpecCount": 0, "recentPlanCount": 0}
    specs = list(docs.glob("**/specs/*.md"))
    plans = list(docs.glob("**/plans/*.md"))
    return {
        "hasDocs": True,
        "hasSpecs": bool(specs),
        "hasPlans": bool(plans),
        "recentSpecCount": len(specs),
        "recentPlanCount": len(plans),
    }


def detect_tech(path: Path) -> dict:
    has_package = (path / "package.json").exists()
    has_gradle = (path / "build.gradle").exists() or (path / "build.gradle.kts").exists() or (path / "settings.gradle").exists()
    has_pom = (path / "pom.xml").exists()
    has_pages = (path / "pages.json").exists()
    has_app_json = (path / "app.json").exists()
    test_patterns = ["**/*test*.*", "**/*spec*.*", "**/tests/**/*"]
    has_tests = any(any(safe_file(p) for p in path.glob(pattern)) for pattern in test_patterns)
    if has_app_json and has_package:
        project_type = "Expo/React Native"
    elif has_gradle:
        project_type = "Android/Gradle"
    elif has_pages and has_package:
        project_type = "UniApp"
    elif has_pom:
        project_type = "Java/Maven"
    elif has_package:
        project_type = "Node/Web"
    else:
        project_type = "Unknown"
    return {
        "type": project_type,
        "hasPackageJson": has_package,
        "hasGradle": has_gradle,
        "hasPomXml": has_pom,
        "hasPagesJson": has_pages,
        "hasAppJson": has_app_json,
        "hasTests": has_tests,
    }


def parse_status(status: str) -> dict:
    counts = {"modified": 0, "added": 0, "deleted": 0, "untracked": 0, "renamed": 0, "total": 0}
    recent_files: list[str] = []
    for line in status.splitlines():
        if not line:
            continue
        counts["total"] += 1
        code = line[:2]
        file_path = line[3:].strip()
        recent_files.append(file_path)
        if code == "??":
            counts["untracked"] += 1
        if "M" in code:
            counts["modified"] += 1
        if "A" in code:
            counts["added"] += 1
        if "D" in code:
            counts["deleted"] += 1
        if "R" in code:
            counts["renamed"] += 1
    return {**counts, "recentFiles": recent_files[:12]}


def infer_status(snapshot: dict) -> str:
    total = snapshot["workingTree"]["total"]
    has_specs = snapshot["docs"]["hasSpecs"]
    has_plans = snapshot["docs"]["hasPlans"]
    if total >= 15:
        return "开发中，未提交改动较多"
    if total > 0 and has_plans:
        return "计划执行中"
    if total > 0:
        return "开发中"
    if has_specs or has_plans:
        return "文档规划中"
    return "低活跃或待补充信息"


def suggest_next(snapshot: dict) -> str:
    total = snapshot["workingTree"]["total"]
    if total >= 15:
        return "先整理未提交改动，区分当前要提交的内容和历史遗留内容。"
    if snapshot["docs"]["hasPlans"] and total > 0:
        return "对照计划检查实现进度，必要时运行测试或整理提交。"
    if snapshot["docs"]["hasSpecs"] and not snapshot["docs"]["hasPlans"]:
        return "基于现有规格文档补一份实施计划。"
    if not snapshot["docs"]["hasDocs"]:
        return "先补齐项目痛点雷达卡和项目工作流文档。"
    return "补充当前阶段、阻塞点和下一步。"


def scan_project(config: dict) -> dict:
    path = config["path"]
    snapshot = {
        "projectId": config["projectId"],
        "name": config["name"],
        "path": str(path).replace("\\", "/"),
        "exists": path.exists(),
        "isGitRepo": False,
        "branch": "",
        "lastCommit": {"hash": "", "message": "", "date": ""},
        "workingTree": {"modified": 0, "added": 0, "deleted": 0, "untracked": 0, "renamed": 0, "total": 0, "recentFiles": []},
        "docs": {"hasDocs": False, "hasSpecs": False, "hasPlans": False, "recentSpecCount": 0, "recentPlanCount": 0},
        "tech": {"type": "Missing", "hasPackageJson": False, "hasGradle": False, "hasPomXml": False, "hasPagesJson": False, "hasAppJson": False, "hasTests": False},
        "inferredStatus": "目录不存在",
        "suggestedNextAction": "确认项目路径是否正确。",
    }
    if not path.exists():
        return snapshot
    snapshot["isGitRepo"] = is_git_repo(path)
    snapshot["docs"] = count_docs(path)
    snapshot["tech"] = detect_tech(path)
    if snapshot["isGitRepo"]:
        snapshot["branch"] = run_git(path, ["branch", "--show-current"])
        last = run_git(path, ["log", "-1", "--format=%h%x09%cs%x09%s"])
        if last:
            parts = last.split("\t", 2)
            if len(parts) == 3:
                snapshot["lastCommit"] = {"hash": parts[0], "date": parts[1], "message": parts[2]}
        snapshot["workingTree"] = parse_status(run_git(path, ["status", "--short"]))
    snapshot["inferredStatus"] = infer_status(snapshot)
    snapshot["suggestedNextAction"] = suggest_next(snapshot)
    return snapshot


def main() -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    snapshots = [scan_project(project) for project in PROJECTS]
    data = {
        "version": 1,
        "updatedAt": now,
        "sourceRoot": str(ROOT).replace("\\", "/"),
        "projects": snapshots,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    for project in snapshots:
        print(f"- {project['name']}: {project['inferredStatus']} ({project['workingTree']['total']} changes)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run scanner**

Run:

```bash
python "D:/coding/private-calculator-chat/scripts/update-project-dashboard.py"
```

Expected output includes:

```text
Wrote D:\coding\private-calculator-chat\docs\project-progress-snapshot.json
```

and one summary line per configured project.

- [ ] **Step 3: Validate generated snapshot JSON**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/project-progress-snapshot.json" > /tmp/project-progress-snapshot.pretty.json
```

Expected: command exits with code 0 and prints no error.

- [ ] **Step 4: Commit**

```bash
git add "scripts/update-project-dashboard.py" "docs/project-progress-snapshot.json"
git commit -m "feat: add project progress scanner"
```

---

### Task 3: Update Portfolio Workflow Documentation

**Files:**
- Modify: `docs/project-portfolio-workflow.md`

- [ ] **Step 1: Replace workflow document**

Replace `docs/project-portfolio-workflow.md` with exactly this content:

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

## 4. 双轨进度系统

总控台进度分成两条轨：

### 自动采集轨

来自 `D:/coding` 下项目仓库，记录：

- 当前分支
- 最近提交
- 未提交改动数量
- 文档/spec/plan 情况
- 技术类型
- 测试文件是否存在
- 自动推断开发状态
- 自动建议下一步

自动轨输出文件：`docs/project-progress-snapshot.json`。

### 人工确认轨

来自用户亲自确认的现实事项，记录：

- 公司变更
- 经营范围
- 软著
- 域名/备案
- 上架审核
- 店铺开通
- 达人联系
- 用户咨询
- 成交/退款

人工轨输出文件：`docs/manual-progress-log.json`。

自动轨不能覆盖人工轨，不能把代码进展误判为外部事项完成。

## 5. 更新方式

用户说：

> 更新项目总控台

Claude 执行：

```bash
python "D:/coding/private-calculator-chat/scripts/update-project-dashboard.py"
```

然后同步检查：

1. `docs/project-progress-snapshot.json`
2. `docs/manual-progress-log.json`
3. `docs/master-project-dashboard.html`

用户说现实进展时，例如：

> 软著提交了，名称是 XXX。

Claude 更新：

1. `docs/manual-progress-log.json`
2. 对应子工作流文档
3. 必要的长期记忆
4. 总控台展示

## 6. 评分维度

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

## 7. 痛点转译链

每个项目都必须经过：

```text
真实需求 → 产品功能 → 对外话术 → 推广场景
```

内部真实需求可以讲透，外部表达必须合规、体面、清晰。

## 8. 当前主线

当前主线是：私密聊天助手。

当前子工作流是：上架与合规。

入口：`docs/app-listing-dashboard.html`
```

- [ ] **Step 2: Commit**

```bash
git add "docs/project-portfolio-workflow.md"
git commit -m "docs: describe dual-track progress workflow"
```

---

### Task 4: Update Dashboard to Display Dual Tracks

**Files:**
- Modify: `docs/master-project-dashboard.html`

- [ ] **Step 1: Replace dashboard HTML**

Replace `docs/master-project-dashboard.html` with this complete file:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>项目组合总控台 v3</title>
  <style>
    :root{--ink:#191713;--muted:#746c60;--paper:#fffaf0;--line:#ddcbb2;--gold:#b66a14;--red:#b13d31;--green:#2f7d63;--blue:#386b9d;--violet:#7652a6;--shadow:0 24px 80px rgba(54,36,18,.16)}
    *{box-sizing:border-box}body{margin:0;color:var(--ink);font-family:"Microsoft YaHei","Noto Serif SC",serif;background:radial-gradient(circle at 8% -5%,rgba(246,176,75,.38),transparent 34rem),radial-gradient(circle at 90% 4%,rgba(56,107,157,.16),transparent 32rem),linear-gradient(135deg,#eed6b6,#fffaf0 50%,#ead5ba);min-height:100vh}.wrap{width:min(1500px,calc(100% - 32px));margin:auto;padding:30px 0 64px}.hero,.card,.project,.module{border:1px solid rgba(120,88,48,.2);background:rgba(255,250,240,.82);border-radius:30px;box-shadow:var(--shadow)}.hero{padding:30px;display:grid;grid-template-columns:1.08fr .92fr;gap:22px;position:relative;overflow:hidden}.hero:after{content:"PORTFOLIO\A SYNC";white-space:pre;position:absolute;right:24px;top:18px;font:900 clamp(48px,8vw,112px)/.82 Georgia,serif;color:rgba(182,106,20,.07);letter-spacing:-.07em;text-align:right}.eyebrow{display:inline-block;border:1px solid rgba(182,106,20,.28);border-radius:999px;padding:8px 13px;color:var(--gold);font-weight:900;background:rgba(255,255,255,.45)}h1{font-size:clamp(34px,5.6vw,78px);line-height:.95;letter-spacing:-.08em;margin:16px 0 12px;position:relative}.sub{color:var(--muted);line-height:1.75;font-size:16px;position:relative}.card{padding:22px;position:relative}.label{font-size:13px;color:var(--muted);font-weight:900;letter-spacing:.12em;text-transform:uppercase}.today{display:grid;gap:10px;margin-top:12px}.today div{padding:13px;border:1px solid rgba(120,88,48,.15);border-radius:17px;background:#fffdf7}.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900}.p0{background:rgba(177,61,49,.1);color:var(--red)}.p1{background:rgba(182,106,20,.12);color:var(--gold)}.p2{background:rgba(56,107,157,.12);color:var(--blue)}.auto{background:rgba(56,107,157,.12);color:var(--blue)}.manual{background:rgba(118,82,166,.12);color:var(--violet)}.ok{background:rgba(47,125,99,.12);color:var(--green)}.warn{background:rgba(177,61,49,.1);color:var(--red)}.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}.btn{display:inline-flex;justify-content:center;text-decoration:none;color:var(--ink);font-weight:900;border:1px solid rgba(120,88,48,.22);border-radius:999px;padding:9px 12px;background:#fff9ef;cursor:pointer}.btn:hover{transform:translateY(-1px)}.grid{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:14px;margin-top:20px}.project{padding:18px;box-shadow:0 12px 38px rgba(54,36,18,.08)}.project.active{outline:3px solid rgba(182,106,20,.25)}.project h2{margin:10px 0 6px;font-size:24px;letter-spacing:-.04em}.project p{margin:0;color:var(--muted);line-height:1.55}.meta{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.progress{height:12px;border-radius:999px;background:#ead8c1;overflow:hidden}.progress span{display:block;height:100%;background:linear-gradient(90deg,var(--gold),#f2b45b)}.actions{display:grid;gap:8px;margin-top:14px}.section{display:flex;justify-content:space-between;align-items:end;margin:34px 0 14px}h3{font-size:34px;margin:0;letter-spacing:-.05em}.detail{display:grid;grid-template-columns:1fr 1fr;gap:14px}.module{padding:18px;box-shadow:0 12px 38px rgba(54,36,18,.08)}.module b{font-size:18px}.module ul{margin:12px 0 0;padding-left:20px;color:var(--muted);line-height:1.75}.score{display:grid;gap:9px}.score-row{display:grid;grid-template-columns:120px 1fr 36px;gap:10px;align-items:center}.scorebar{height:10px;border-radius:999px;background:#ead8c1;overflow:hidden}.scorebar span{display:block;height:100%;background:linear-gradient(90deg,var(--blue),#7fb0dd)}.track{border:1px solid rgba(120,88,48,.16);background:#fffdf7;border-radius:18px;padding:13px;margin-top:10px}.track h4{margin:0 0 8px}.track p{margin:6px 0;color:var(--muted);line-height:1.55}.note{margin-top:20px;padding:16px 18px;border-left:5px solid var(--gold);border-radius:18px;background:rgba(255,250,240,.78);color:var(--muted);line-height:1.7}@media(max-width:1150px){.grid{grid-template-columns:repeat(2,1fr)}.detail,.hero{grid-template-columns:1fr}}@media(max-width:650px){.grid{grid-template-columns:1fr}.wrap{width:min(100% - 20px,1500px)}}
  </style>
</head>
<body>
<div class="wrap">
  <section class="hero">
    <div>
      <span class="eyebrow">爆款 APP 开发机器 · 双轨进度总控台</span>
      <h1>自动看代码进展，人工确认现实进展。</h1>
      <p class="sub" id="philosophyText">不追风口，追真实痛点；像价值投资一样做 APP。自动轨只看开发事实，人工轨记录软著、备案、上架、推广和成交。</p>
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

  <div class="section"><h3 id="detailTitle">项目详情</h3><span class="sub">自动轨 + 人工轨</span></div>
  <section class="detail">
    <div class="module" id="projectDetail"></div>
    <div class="module"><b>项目评分器</b><div class="score" id="scoreList"></div></div>
  </section>

  <div class="section"><h3>标准生产线</h3><span class="sub">每个项目都套同一套爆款 APP 开发流程</span></div>
  <section class="detail" id="workflowModules"></section>

  <div class="note"><b>更新方式：</b>你说“更新项目总控台”，Claude 运行 <code>scripts/update-project-dashboard.py</code> 生成自动快照；你说“我完成了某某事项”，Claude 更新人工进展。</div>
</div>
<script>
const portfolio = {
  scoreDimensions: [['explicitPain','显性痛点'],['hiddenNeed','隐性需求'],['frequency','频率'],['audienceClarity','人群清晰度'],['solutionEffect','解决效果'],['paymentPotential','付费可能性'],['acquisitionReach','获客可达性'],['mvpDifficulty','MVP 难度'],['complianceSafety','合规安全'],['founderFit','创始人熟悉度']],
  workflowModules: ['创始人痛点雷达','项目评分器','痛点转译链','MVP 工作流','上架与合规','AI 推广增长引擎','数据复盘与自动优化'],
  projects: [
    {id:'frozen-order',name:'冻品开单助手',category:'业务工具',stage:'痛点雷达待完善',priority:'P1',summary:'面向冻品批发从业者的开单、客户、商品、订单效率工具。',currentFocus:'补齐痛点雷达卡：开单流程、同行痛点、现有替代方案、付费触发点。',subflows:[],scores:{explicitPain:8,hiddenNeed:3,frequency:8,audienceClarity:8,solutionEffect:7,paymentPotential:6,acquisitionReach:8,mvpDifficulty:7,complianceSafety:8,founderFit:9}},
    {id:'ai-girlfriend',name:'AI 女友',category:'AI 情感产品',stage:'痛点雷达待完善',priority:'P1',summary:'AI 陪伴、情绪价值、亲密互动和订阅付费方向。',currentFocus:'拆分内部真实需求与对外合规定位，避免泛泛做陪伴。',subflows:[],scores:{explicitPain:5,hiddenNeed:9,frequency:7,audienceClarity:6,solutionEffect:6,paymentPotential:8,acquisitionReach:6,mvpDifficulty:5,complianceSafety:4,founderFit:8}},
    {id:'private-chat',name:'私密聊天助手',category:'隐私/亲密沟通',stage:'MVP + 上架合规推进中',priority:'P0',summary:'计算器入口、双人私密聊天、会员月卡、赠送机制。',currentFocus:'继续推进 MVP 打磨、公司主体变更、软著名称、协议草稿。',subflows:[{name:'上架合规子工作流',href:'app-listing-dashboard.html'}],scores:{explicitPain:6,hiddenNeed:9,frequency:7,audienceClarity:7,solutionEffect:7,paymentPotential:8,acquisitionReach:6,mvpDifficulty:6,complianceSafety:4,founderFit:8}},
    {id:'golden-idea',name:'金点子',category:'方法论产品',stage:'概念成型',priority:'P1',summary:'从创意到 APP 变现的流程、模板、评分器和 AI 工作流系统。',currentFocus:'沉淀爆款 APP 开发机器方法论，并先用于内部项目组合。',subflows:[],scores:{explicitPain:7,hiddenNeed:5,frequency:7,audienceClarity:6,solutionEffect:8,paymentPotential:7,acquisitionReach:6,mvpDifficulty:7,complianceSafety:8,founderFit:10}},
    {id:'tianyuan',name:'天缘',category:'本地交友征婚平台',stage:'痛点雷达待完善',priority:'P1',summary:'天长市本地交友征婚 App/小程序，偏同城严肃婚恋和中年再连接。',currentFocus:'明确目标用户、真实性机制、线下获客和合规边界。',subflows:[],scores:{explicitPain:6,hiddenNeed:9,frequency:6,audienceClarity:8,solutionEffect:6,paymentPotential:7,acquisitionReach:7,mvpDifficulty:4,complianceSafety:4,founderFit:8}}
  ]
};
const autoSnapshot = {
  updatedAt: '未扫描',
  projects: []
};
const manualLog = {
  items: [
    {projectId:'private-chat',module:'上架与合规',item:'域名 yifan1.com',status:'个人名义已购买',requiresUserAction:true,isBlocking:true,note:'用户说明 yifan1.com 是个人名义购买。后续如用于公司 App 上架、备案、协议页，需要确认是否转为公司主体实名/备案，或另购公司域名。',nextAction:'新公司主体确定后，确认 yifan1.com 是否转公司实名/备案，或选择新的公司主体域名。'},
    {projectId:'private-chat',module:'上架与合规',item:'公司名称变更和经营范围增项',status:'已预约',requiresUserAction:true,isBlocking:true,note:'用户已预约 2026-05-06 让代账会计办理公司名称变更和经营范围增项。',nextAction:'2026-05-06 后确认办理结果，并更新新营业执照信息。'}
  ]
};
let selectedId = localStorage.getItem('portfolio.selectedProject') || 'private-chat';
function avgScore(project){const vals=Object.values(project.scores);return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10}
function priorityClass(priority){return priority === 'P0' ? 'p0' : priority === 'P1' ? 'p1' : 'p2'}
function autoFor(projectId){return autoSnapshot.projects.find(p=>p.projectId===projectId)||autoSnapshot.projects.find(p=>projectId==='frozen-order'&&p.projectId==='frozen-order-lite')}
function manualFor(projectId){return manualLog.items.filter(i=>i.projectId===projectId)}
function render(){renderToday();renderProjects();renderDetail();renderModules()}
function renderToday(){const sorted=[...portfolio.projects].sort((a,b)=>(a.priority>b.priority?1:-1)||avgScore(b)-avgScore(a));document.getElementById('todayList').innerHTML=sorted.slice(0,3).map(p=>`<div><span class="pill ${priorityClass(p.priority)}">${p.priority}</span> <b>${p.name}</b>：${p.currentFocus}</div>`).join('')}
function renderProjects(){document.getElementById('projectGrid').innerHTML=portfolio.projects.map(p=>{const a=autoFor(p.id);const m=manualFor(p.id);return `<article class="project ${p.id===selectedId?'active':''}" onclick="selectProject('${p.id}')"><span class="pill ${priorityClass(p.priority)}">${p.priority}</span><h2>${p.name}</h2><p>${p.summary}</p><div class="meta"><span class="pill p2">${p.category}</span><span class="pill ok">均分 ${avgScore(p)}</span><span class="pill auto">AUTO ${a?a.workingTree.total:'未扫'}</span><span class="pill manual">MANUAL ${m.length}</span></div><div class="actions">${p.subflows.map(s=>`<a class="btn" href="${s.href}" onclick="event.stopPropagation()">${s.name}</a>`).join('') || '<span class="btn">子工作流待创建</span>'}</div></article>`}).join('')}
function renderDetail(){const p=portfolio.projects.find(x=>x.id===selectedId);const a=autoFor(p.id);const m=manualFor(p.id);document.getElementById('detailTitle').textContent=p.name+' · 项目详情';document.getElementById('projectDetail').innerHTML=`<b>${p.stage}</b><p>${p.summary}</p><p><b>当前重点：</b>${p.currentFocus}</p><div class="track"><h4><span class="pill auto">AUTO</span> 自动开发进度</h4>${a?`<p>路径：${a.path}</p><p>分支：${a.branch||'无'}</p><p>最近提交：${a.lastCommit.hash} ${a.lastCommit.message}</p><p>未提交改动：${a.workingTree.total}</p><p>推断状态：${a.inferredStatus}</p><p>建议：${a.suggestedNextAction}</p>`:'<p>尚未扫描。说“更新项目总控台”后生成自动快照。</p>'}</div><div class="track"><h4><span class="pill manual">MANUAL</span> 人工现实进度</h4>${m.length?m.map(item=>`<p><b>${item.item}</b>：${item.status}${item.requiresUserAction?'｜需要用户操作':''}${item.isBlocking?'｜阻塞':''}<br>${item.note}<br>下一步：${item.nextAction}</p>`).join(''):'<p>暂无人工确认事项。</p>'}</div>`;document.getElementById('scoreList').innerHTML=portfolio.scoreDimensions.map(([id,name])=>{const v=p.scores[id];return `<div class="score-row"><span>${name}</span><div class="scorebar"><span style="width:${v*10}%"></span></div><b>${v}</b></div>`}).join('')}
function renderModules(){document.getElementById('workflowModules').innerHTML=portfolio.workflowModules.map((m,i)=>`<div class="module"><b>${i+1}. ${m}</b><ul><li>用于把项目从痛点推进到产品、推广和复盘。</li><li>后续可沉淀成金点子的标准模块。</li></ul></div>`).join('')}
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

Expected: page loads, project cards show `AUTO` and `MANUAL` badges, and the selected project detail shows separate automatic and manual progress boxes.

- [ ] **Step 3: Commit**

```bash
git add "docs/master-project-dashboard.html"
git commit -m "feat: show dual-track project progress"
```

---

### Task 5: Run End-to-End Verification

**Files:**
- Read: `docs/project-progress-snapshot.json`
- Read: `docs/manual-progress-log.json`
- Read: `docs/master-project-dashboard.html`
- Read: `docs/project-portfolio-workflow.md`

- [ ] **Step 1: Re-run scanner**

Run:

```bash
python "D:/coding/private-calculator-chat/scripts/update-project-dashboard.py"
```

Expected: scanner writes `docs/project-progress-snapshot.json` and prints one summary line per configured project.

- [ ] **Step 2: Validate JSON files**

Run:

```bash
python -m json.tool "D:/coding/private-calculator-chat/docs/project-progress-snapshot.json" > /tmp/project-progress-snapshot.pretty.json
python -m json.tool "D:/coding/private-calculator-chat/docs/manual-progress-log.json" > /tmp/manual-progress-log.pretty.json
```

Expected: both commands exit with code 0 and print no error.

- [ ] **Step 3: Check dashboard has no remote dependencies**

Run:

```bash
python - <<'PY'
from pathlib import Path
s = Path('D:/coding/private-calculator-chat/docs/master-project-dashboard.html').read_text(encoding='utf-8')
bad = ['https://', '<script src=', '<link href=']
missing = [b for b in bad if b in s]
print('remote dependency markers:', missing)
raise SystemExit(1 if missing else 0)
PY
```

Expected output:

```text
remote dependency markers: []
```

- [ ] **Step 4: Check required concepts are visible**

Run:

```bash
python - <<'PY'
from pathlib import Path
s = Path('D:/coding/private-calculator-chat/docs/master-project-dashboard.html').read_text(encoding='utf-8')
required = ['冻品开单助手', 'AI 女友', '私密聊天助手', '金点子', '天缘', 'AUTO', 'MANUAL', '自动开发进度', '人工现实进度', '更新项目总控台']
missing = [x for x in required if x not in s]
print('missing:', missing)
raise SystemExit(1 if missing else 0)
PY
```

Expected output:

```text
missing: []
```

- [ ] **Step 5: Check changed files scope**

Run:

```bash
git diff --stat
```

Expected: new/modified files include only the progress sync files, docs, dashboard, and existing unrelated user changes already present before this plan.

---

## Plan Self-Review

Spec coverage: This plan implements the manual-trigger dual-track progress system from the spec: scanner, automatic snapshot, manual progress log, dashboard display, and workflow documentation. It explicitly does not implement background scanning, external platform automation, or automatic real-world completion claims, matching the spec's safety boundary.

Placeholder scan: No TBD/TODO placeholders are present. All code, JSON, HTML, commands, and expected outputs are specified.

Type consistency: The project ids `frozen-order`, `ai-girlfriend`, `private-chat`, `golden-idea`, and `tianyuan` are consistent between dashboard and manual log. The scanner also emits `frozen-order-lite` as a separate auto snapshot for the frozen assistant worktree, and the dashboard maps that to the frozen project when available.
