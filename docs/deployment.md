# 部署与迁移说明

这份文档对应当前仓库的实际部署方式，目标是做到：

- 本地能跑
- 单机 VPS 能部署
- 后续能带着数据平滑迁移

## 当前生产方案

仓库当前使用：

- `Dockerfile`
- `docker-compose.prod.yml`
- `deploy/Caddyfile`

默认组合是：

- `db`：PostgreSQL 16
- `app`：Next.js 应用
- `caddy`：HTTPS、反向代理、自动续签证书

## 生产前准备

### 环境变量

至少需要确认这些字段：

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `UPLOAD_DIR`
- `UPLOAD_PUBLIC_PATH`

如果要启用 SEO 自动提交，还需要：

- `SEARCH_SUBMIT_ENABLED`
- `INDEXNOW_KEY`
- `BAIDU_SITE`
- `BAIDU_TOKEN`

### 域名

如果你使用 Caddy 自动签证书：

- 域名要先正确解析到服务器
- `deploy/Caddyfile` 中的站点域名要与你的正式域名一致

## 启动方式

### 首次部署

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 更新部署

```bash
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
```

如果数据库 Schema 有变更，再执行：

```bash
docker compose -f docker-compose.prod.yml run --rm app npm run db:migrate
```

## 数据持久化

Docker 解决的是“应用环境一致”，不是“数据天然跟镜像走”。

当前需要持久化的关键数据有三块：

- PostgreSQL 数据
- 上传文件
- 生产环境变量

在当前 compose 方案里，主要对应：

- `./data/postgres`
- `./data/uploads`
- `.env`

如果这三样没有一起保住，换服务器时就不能算无缝迁移。

## 迁移到新服务器

如果以后只是换服务器、域名不变，推荐流程：

1. 在新服务器准备 Docker、Docker Compose 和仓库代码
2. 拷贝旧服务器的 `.env`
3. 恢复 `data/postgres`
4. 恢复 `data/uploads`
5. 启动新服务器容器
6. 验证前台、后台、上传文件、登录、`/api/auth/session`
7. 把域名 A 记录切到新 IP

## 备份建议

仓库内已有脚本：

- `npm run backup:export`
- `npm run backup:import`

但要注意：

- 备份脚本解决的是“业务数据导出/导入”
- 运行期上传文件仍然需要额外保留

更稳妥的备份习惯是：

1. 定期导出数据库业务备份
2. 定期打包上传目录
3. 单独保留生产 `.env`

## 上线前检查清单

建议至少确认这些点：

1. `npm run lint`
2. `npm run build`
3. `npm run db:migrate`
4. 前台首页可访问
5. 文章详情页可访问
6. 后台登录正常
7. 上传文件可访问
8. `sitemap.xml` 与 `robots.txt` 正常
9. `https` 正常、`http` 自动跳转

## 当前已知优化点

当前生产容器启动命令仍然是：

```bash
npm run build && npm run start
```

这意味着：

- 每次重启或重新部署应用时，容器会先在服务器里重新跑完整个 `next build`
- 在这段时间内，反向代理可能返回短暂的 `502`

后续更推荐改成：

- 镜像构建阶段完成 `next build`
- 运行阶段只执行 `next start`

这样上线窗口会更短，也更稳定。

## 如果以后接对象存储

当前仓库默认把上传写到本地 `public/uploads/`。

如果未来迁到：

- S3
- Cloudflare R2
- 阿里云 OSS
- 腾讯云 COS

那么好处会是：

- 应用服务器更接近无状态
- 文件迁移不再依赖本地卷
- CDN 分发会更方便

但这属于下一阶段优化，不是当前仓库上线的前置条件。
