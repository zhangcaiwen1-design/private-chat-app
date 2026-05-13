# 私密聊天部署速记

## 当前最快路径

1. 本地先确认版本号和测试：
   - `app.json`
   - `app-version.json`
   - `package.json`
   - `backend/package.json`
   - `docs/privatechat-download-page.html` 或当前首页文件
   - `npm run lint`
   - `cd backend && npm test`
2. 不在脏工作区直接发版。用干净 worktree 从最新线上分支开始：
   - `git fetch origin master`
   - `git worktree add -b codex/deploy-版本号 .worktrees/codex-deploy-版本号 origin/master`
3. 把需要上线的改动复制到这个 worktree，避免带上 `dist-*`、`output/`、临时截图和本地测试文件。
4. 在部署 worktree 里提交：
   - `git status --short`
   - `git add ...`
   - `git commit -m "feat: publish private chat 版本号"`
5. 推送触发 GitHub Actions 自动部署到阿里云：
   - 首选：`git push origin HEAD:master`
   - 如果 GitHub HTTPS 443 连接失败，改用 SSH 443：
     `git push ssh://git@ssh.github.com:443/zhangcaiwen1-design/private-chat-app.git HEAD:master`
6. 盯 Actions：
   - `gh run list --branch master --limit 3`
   - `gh run watch <run-id> --exit-status`
   - 失败时用 `gh run view <run-id> --log-failed` 看具体步骤。

## 成功后验证

- 首页：`https://privatechat.yifan1.com/`
- 版本配置：`https://privatechat.yifan1.com/app-version.json`
- APK：`https://privatechat.yifan1.com/download/latest.apk`
- 后端健康检查：`https://privatechat.yifan1.com/health`

## 注意

- 服务器 SSH 凭据不写进仓库；线上部署优先依赖 GitHub Actions Secrets。
- 不要把演示目录、截图、日志、临时脚本一起提交。
- 如果 Actions 后端测试失败，先修测试再重新推送，不要跳过 CI。
- 后端部署时必须在服务器上重新安装生产依赖，避免把 GitHub runner 里的 `backend/node_modules` 带到阿里云后出现 `GLIBC` 二进制不兼容；workflow 里用 `npm ci --omit=dev`。
