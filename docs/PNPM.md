# pnpm 与 Monorepo

## 结构

- 根目录：`package.json`（`packageManager: pnpm@10.15.1`）、`pnpm-workspace.yaml`
- 工作区包：`frontend/`（Next.js）、`backend/`（Express，可选）

## 常用命令

```bash
corepack enable
pnpm install

# 只跑前端
pnpm --filter frontend dev
pnpm --filter frontend build

# 只跑后端（若使用）
pnpm --filter backend dev
```

## Prisma

`frontend` 在 **`postinstall` 中执行 `prisma generate`**，避免 pnpm 默认跳过依赖 build 脚本时客户端未生成。

若仍异常，可手动：

```bash
pnpm --filter frontend exec prisma generate
```

## Docker

镜像构建在**仓库根**解析依赖，与本地同一套 `pnpm-lock.yaml`。勿只复制 `frontend/` 目录而丢失锁文件。

## 升级依赖

```bash
pnpm --filter frontend update next react react-dom
pnpm --filter frontend update -D eslint-config-next prisma @prisma/client
```

提交前请运行 `pnpm --filter frontend build` 做回归。
