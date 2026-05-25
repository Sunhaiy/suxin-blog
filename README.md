# Lihuahaimax

一个围绕「文章、瞬间、作品、ACG、相册、友链」构建的个人内容站点与后台管理系统。  
当前版本基于 Next.js App Router，包含自定义文章编辑器 V2、媒体上传、首页卡片配置、标签/分类管理以及项目与资源展示能力。

## 项目定位

- 前台：个人博客与内容展示站
- 后台：统一内容管理台
- 内容类型：文章、瞬间、作品、动漫、游戏、相册、友链
- 风格目标：干净、规整、偏设计化的内容体验

## 主要功能

### 前台

- 首页 Hero、资料卡、一言卡片、创作活跃度
- 文章列表、文章详情、归档、分类、标签
- 瞬间页面与动态卡片
- 作品项目页与翻转卡片
- ACG 页面：动漫 / 游戏
- 相册与图库资源
- 友情链接展示与申请

### 后台

- 文章编辑器 V2
  - 结构化正文模型
  - 标题、列表、引用、代码块、表格
  - 提示块、步骤流、FAQ、时间线、文件树、终端演示
  - 图片粘贴上传、拖拽上传、相册复用
- 文章分类管理
- 文章标签管理
- 首页资料卡 / 一言池 / 问候语池配置
- 作品管理与封面上传
- 动漫、游戏、相册、友链等内容管理

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL
- NextAuth
- SWR
- Tiptap / ProseMirror
- Zod

## 目录结构

```text
app/                  路由、页面、API
components/           通用组件、后台组件、前台组件
features/             业务模块
lib/                  数据库、校验、站点配置、文章模型
public/               静态资源
scripts/              可复用脚本
types/                全局类型定义
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制一份示例文件：

```bash
cp .env.local.example .env.local
```

至少需要配置：

- `DATABASE_URL`
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `AUTH_SECRET`
- `AUTH_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_BASE_URL`
- `UPLOAD_DIR`
- `UPLOAD_PUBLIC_PATH`

### 3. 数据库迁移

```bash
npm run db:migrate
```

### 4. 启动开发环境

```bash
npm run dev
```

默认访问：

- 前台：[http://localhost:3000](http://localhost:3000)
- 后台登录：[http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## 常用脚本

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run db:migrate
npm run db:seed
npm run content:editor-showcase
npm run backup:export
```

## SEO Auto Submission

- This project can auto-submit published post URLs to IndexNow and Baidu after create, update, delete, or slug change.
- Google does not provide a general-purpose indexing API for normal blog posts, so Google should still be handled through sitemap plus Search Console.
- IndexNow key file is exposed at `/indexnow-key.txt` when `INDEXNOW_KEY` is configured.
- Manual resubmission endpoint: `POST /api/seo/submit` (requires admin session).

Example request body:

```json
{
  "allPublished": true
}
```

You can also submit a subset:

```json
{
  "slugs": ["my-post-slug"],
  "ids": [12],
  "urls": ["https://example.com/posts/my-post-slug"]
}
```

Useful env vars:

- `SEARCH_SUBMIT_ENABLED`
- `INDEXNOW_KEY`
- `INDEXNOW_ENDPOINT`
- `INDEXNOW_KEY_LOCATION`
- `BAIDU_TOKEN`
- `BAIDU_SITE`
- `BAIDU_SUBMIT_ENDPOINT`
- `BAIDU_SUBMIT_TYPE`

## Migration Notes

- Docker can package the app, but data still lives outside the image.
- To move the site cleanly to another server, you need all three parts together:
- PostgreSQL data
- `public/uploads`
- production env vars
- `npm run db:seed` is for local demo/init only and will clear existing business tables before inserting sample data.

## 文章编辑器 V2 说明

当前文章编辑器走的是新的结构化正文体系，不再兼容旧的宽松正文结构。

支持的核心块包括：

- Paragraph
- H1 - H6
- List
- Quote
- Divider
- Code Block
- Table
- Image Figure
- Callout
- Step Flow
- FAQ
- Timeline
- Two Column
- File Tree
- Terminal Demo

## 上传与持久化说明

项目默认把上传文件写入本地：

- `public/uploads/`

这适合：

- 本地开发
- 自有服务器
- 有持久化磁盘的 Docker / VPS 环境

如果你部署到无本地持久化的平台，需要先把上传改到对象存储，否则文章封面、作品封面、相册资源、视频等文件无法长期保留。

## 上线建议

建议上线前确认以下几点：

1. 生产环境变量已经补齐
2. PostgreSQL 连接正常
3. `public/uploads` 已做持久化挂载或备份
4. 已跑过一次 `npm run build`
5. 已手测以下链路：
   - 文章发布
   - 文章封面上传 / 清空
   - 作品封面上传
   - 首页一言随机
   - 标签管理重命名 / 删除

## 仓库说明

- 本仓库不会提交本地上传资源
- 不会提交 `.env.local`
- 不会提交 `.next`、`.next-dev` 等构建缓存
- 初始数据库内容与站点数据不在本次目录清理范围内

## Deployment Notes

- Set `AUTH_URL` to your production origin, for example `https://your-site.com`.
- `AUTH_URL` should match the public site origin used by visitors and admin login.
- Run `npm run lint` and `npm run build` before each release.

## License

当前仓库默认按私有项目方式维护。如需公开发布，建议补充正式 License。
