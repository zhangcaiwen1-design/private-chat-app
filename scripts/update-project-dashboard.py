#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from datetime import datetime
from pathlib import Path

ROOT = Path("D:/coding")
OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "project-progress-snapshot.json"

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
    return result.stdout.rstrip()


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
