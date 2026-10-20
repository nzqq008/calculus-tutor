# 微积分自适应学习系统 · 前端

本仓库包含学生前端与 GitHub Pages 发布配置。后端在开发者自己的电脑运行，通过 HTTPS 公网隧道提供 API。

网站地址：https://nzqq008.github.io/calculus-tutor/

前端提供知识点选择、基础学习、测评、误解诊断、前置知识补救、复测与学习记录。

## 发布

1. Repository Settings → Pages → Source 选择 GitHub Actions。
2. Repository Settings → Secrets and variables → Actions → Variables 配置 `API_BASE_URL`，值为公开的后端 HTTPS 地址，包含 `/api/v1`。不在仓库中保存模型密钥。
3. 推送到 `main` 自动发布，也可以在 Actions 手动运行 Publish frontend to GitHub Pages，覆盖本次构建的后端地址。

后端隧道地址变化时，更新变量并重新运行工作流。访问时需保持本机后端与隧道运行。

## 本地开发

在 `frontend` 目录执行 `npm ci` 和 `npm run dev`。本地开发默认通过 Vite 将 `/api` 转发给 `127.0.0.1:8000`。本仓库不包含后端、数据库或模型凭据。
