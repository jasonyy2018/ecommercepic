# ecommercepic

地毯行业 **AI 出图** 全栈应用（Next.js + PostgreSQL）。

## Docker 一键部署

```bash
copy .env.docker.example .env
# 编辑 .env，修改 POSTGRES_PASSWORD

docker compose up -d --build
```

浏览器访问：<http://localhost:3000>

详细说明见 **[docs/DOCKER.md](./docs/DOCKER.md)**。

## 生产级 Docker 部署

```bash
copy .env.prod.example .env.prod
# 编辑 .env.prod：配置域名、邮箱、数据库强密码

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

生产部署默认使用 Caddy 反向代理 + HTTPS（Let's Encrypt）。

## 本地开发（前端）

```bash
cd frontend
npm install
# 配置 .env 中 DATABASE_URL
npm run db:migrate:deploy
npm run dev
```

更多见 [frontend/README.md](./frontend/README.md)。
