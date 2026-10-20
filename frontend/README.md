# 微积分学习室前端

React + TypeScript + Vite 学生端，使用 Tailwind CSS、KaTeX 与 TanStack Query。知识图采用响应式节点与独立 SVG 连线，状态仅显示待学习、学习中、已掌握。包含知识探索、学习工作台、学习报告三个页面。只展示五个知识点的依赖网络，诊断与教学决策由 Python 后端负责。

2026-10-20 更新：工作台改为学习路线、技能进度与当前任务两栏，移除学习搭子。前置先做两题检查，结果矛盾追加辨别；确认缺口后完整学习、测评该关，必要时递归检查其前置。补救两道不同题验证，保留已通过结果，只有独立通关节点显示已掌握。题目和报告区分前置检查、测评、补救验证、返回验证与技能补查。点击已有知识点默认继续原记录，可明确选择新一轮。详见 `../docs/ADAPTIVE_REMEDIATION.md`。

## 本地启动

需要 Python 3.11+、uv，以及 Node.js 22.12+（验收使用 Node.js 24）和 npm。以下命令使用 PowerShell。

终端一，在仓库根目录：

```powershell
uv sync --extra dev
$env:MOCK_LLM="true"
uv run uvicorn calculus_tutor.api.main:app --host 127.0.0.1 --port 8000
```

终端二：

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

打开 <http://127.0.0.1:5173/>。开发环境的空 `VITE_API_BASE_URL` 会使用 Vite 代理，将 `/api/v1` 转发到实际 FastAPI `127.0.0.1:8000`。无需模拟前端接口，也无需跨域。默认数据库以根目录后端配置为准。

本次开发机器的 PATH 只有 Node，没有 npm；已在被 Git 忽略的 `.local/tools` 中准备临时 npm。此机器可在 `frontend` 内用 `node ../.local/tools/node_modules/npm/bin/npm-cli.js` 替代上述 `npm`；该路径不是其他机器的安装前提。

## 配置

| 变量                | 本地开发                          | 正式静态站点                                                     |
| ------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `VITE_API_BASE_URL` | 留空使用代理，或显式完整 API 地址 | 必须配置独立公网 HTTPS 地址，如 `https://api.example.com/api/v1` |
| `VITE_BASE_PATH`    | 默认 `/`                          | 仓库站点 `/实际仓库名/`；个人站点或自定义域名 `/`                |

API 地址必须包含 `/api/v1`，不能包含凭据、查询参数或片段。`VITE_` 变量会进入浏览器产物，只能存放公开配置。DeepSeek 密钥只设置在 Python 后端。

生产构建没有 API 配置时会显示配置错误，不会自动请求 localhost。变量在构建时写入，修改后必须重新构建。

直连 API 时，后端的 `CORS_ORIGINS` 必须包含前端完整来源。例如本地预览用 `http://127.0.0.1:4173`，Pages 用 `https://实际用户名.github.io`。CORS 来源不含仓库路径，也不含结尾斜杠。现有后端允许 Authorization 请求头及所需方法。

## 学习流程与数据

- 点击任意知识节点，查看真实详情并创建匿名学习会话。
- 点击“进入关卡学习”后先展示后端提供的基础目标、讲解、公式和分步例题，学习期间可以追问。点击“学完了，开始挑战”后才请求题目；单纯阅读、聊天不点亮节点。详见 `../docs/LEARN_FIRST_CHANGE.md`。
- 按后端 `next_action` 展示基础学习、关卡挑战、诊断题、指导、验证题、完整掌握测试、暂停或复核。
- 前置补习时同时展示原目标、当前知识点和返回原因；补习完成不代表原目标已掌握。
- 基础学习和针对性教学期间可以追问，使用后端当前配置的模型；挑战时先独立作答，非流式响应有等待提示。
- 单选、表达式、多选、简答均按实际题型渲染。后面三种也可从“额外练习”进入；额外练习不改变掌握结论。
- 匿名令牌保存在当前来源的 localStorage，并按 API 地址隔离。刷新后使用真实会话继续；没有登录、注册或跨设备找回。
- “本机学习记录”最多保存 30 个会话入口，首页展示最近 6 个。后端没有会话列表 API，因此这不是完整服务器历史。
- 答案提交使用后端 `assignment_id` 和幂等 `request_id`；同一标签页待确认提交保存在 sessionStorage，刷新后可重试原请求或同步。不要在请求结果不明时换一个 request_id 重复提交。
- 教学和答题历史来自只读 `learning-summary` 接口。它投影既有记录、诊断说明、保留的对话及练习目录，不修改 Agent 状态机。
- 当前后端对话只保留有限上下文；前端展示服务端仍保留的消息。模型失败的基础讲解回退会明确标注。

重置身份只清除浏览器入口和令牌，不删除服务器记录；匿名系统没有账号恢复，因此重置前有确认提示。

## 检查与浏览器测试

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试会启动实际 Python Mock 后端和 Vite，数据库为被忽略的 `.local/frontend-e2e.db`；先在根目录完成 `uv sync --extra dev`。测试不调用付费模型，也不以伪造响应代替正常教学结果。网络故障测试会中断真实请求以验证重试。

若自行启动了两个服务，可设置 `$env:E2E_EXTERNAL_SERVERS="1"`。生产子路径验收可将 `$env:E2E_BASE_URL="http://127.0.0.1:4173/preview-repo/"` 指向下方预览地址。CI 会自动启动隔离服务，端口 8000、5173 应可用。

## 本地检查静态产物

先让后端允许 `http://127.0.0.1:4173` 的 CORS，然后执行：

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000/api/v1"
$env:VITE_BASE_PATH="/preview-repo/"
npm run build
npm run preview
```

打开 <http://127.0.0.1:4173/preview-repo/>。此 HTTP 地址仅用于本地验收，正式部署必须填写公网 HTTPS API。路由使用 HashRouter，例如 `/preview-repo/#/learn/会话ID`，刷新不会要求静态服务器解析学习路由。

预览结束后如需恢复默认开发设置，执行 `Remove-Item Env:VITE_API_BASE_URL,Env:VITE_BASE_PATH -ErrorAction SilentlyContinue`。`vite preview` 只用于本地验证。

## GitHub Pages 发布

GitHub Pages 只托管 `frontend/dist` 静态文件，不能运行 FastAPI。后端需独立部署，持久化数据库并配置模型、HTTPS 和 CORS。

已准备 `.github/workflows/frontend-pages.yml`。目前仅允许手动触发，不会因本地提交或普通推送自动上线；没有猜测用户名、仓库或分支。

收到正式信息并确认发布后：

1. 将仓库推送到用户指定的 GitHub 仓库，工作流文件需在默认分支中。
2. 在仓库 Settings → Pages → Build and deployment 将 Source 选择为 GitHub Actions。
3. 后端配置 `CORS_ORIGINS=https://实际用户名.github.io`；使用自定义域名时填写实际来源。确认公网 API 健康和 HTTPS 可用。
4. 在 Actions 选择 “Frontend · verify and deploy Pages”，点击 Run workflow。
5. `api_base_url` 填公网后端地址，包含 `/api/v1`；`base_path` 留空会从实际仓库推导。自定义域名用 `/`，也可显式指定 `/实际仓库名/`。
6. 工作流执行 npm ci、前端检查、后端回归和本地浏览器联调，再构建并发布静态产物。公开 API 仅用于最终构建；CI 联调使用本地 Mock 后端。
7. 访问工作流产出的 Pages 地址，再验收公网教学闭环。自定义域名还需配置 Pages 域名、DNS 与 HTTPS。

部署结构参考 [Vite 官方 Pages 指南](https://vite.dev/guide/static-deploy.html#github-pages)。本地 YAML 和构建已检查；GitHub 托管执行和公网后端连接只有发布后才能证明。

发布前需要：目标 GitHub 仓库地址、有权限的本机 GitHub 登录、后端公网 HTTPS API 地址；自定义域名可选。不需要把 GitHub 密码、PAT 或 DeepSeek 密钥发到对话里。

实际验收记录见 `../docs/FRONTEND_ACCEPTANCE.md`，恢复进度见 `../FRONTEND_PROGRESS.md`。
