# 仓库结构说明

这份说明面向两类场景：

- 新协作者第一次进入仓库，想快速知道东西放哪
- 后续继续演进时，想尽量沿着现有边界扩展，而不是把逻辑越堆越乱

## 顶层目录

### `app/`

`Next.js App Router` 的页面、布局、路由组与 API 路由都在这里。

主要分区：

- `app/(blog)/`：前台公开站点
- `app/admin/`：后台登录页
- `app/dashboard/`：后台控制台页面
- `app/api/`：后端接口
- `app/layout.tsx`：全站根布局
- `app/globals.css`：全局样式

当前前台还用了一个路由组：

- `app/(blog)/(with-symbols)/`

它的作用是把仍然依赖 `Material Symbols` 图标字体的公开页面单独包起来，避免把整套图标字体重新塞回全站根布局。

### `components/`

共享组件目录，按用途分层：

- `components/ui/`：前后台通用 UI 组件
- `components/admin/`：后台框架与管理组件
- `components/article/`：文章渲染相关组件
- `components/scene/`：首页场景层、滤镜、背景、状态块等

如果一个组件主要服务某个页面，但没有强业务语义，通常优先放这里。

### `features/`

更偏业务模块化的前端封装。

例如：

- `features/posts/`
- `features/moments/`
- `features/gallery/`
- `features/acg/`
- `features/editor/`

这里更适合放：

- 业务 hooks
- 请求封装
- 局部类型
- 面向某一能力的客户端模块

### `lib/`

项目的核心能力层。

里面按职责拆分为：

- `lib/db/`：数据库连接、迁移、Schema、DAO
- `lib/auth/`：认证配置与管理员兜底逻辑
- `lib/editor/`：编辑器扩展与节点注册
- `lib/seo/`：搜索引擎提交通道
- `lib/storage/`：本地存储实现
- `lib/validation/`：输入校验
- `lib/articles/`：文章结构与文档规格
- `lib/ai/`：AI 写作与第三方模型接入
- `lib/utils/`：小型辅助函数

如果你在判断一个逻辑该不该进 `lib/`，一个简单标准是：

“它是不是页面无关、可复用、并且更像基础能力而不是展示层。”

### `public/`

前端静态资源目录。

当前主要包括：

- `public/article-covers/`
- `public/uploads/`

注意：

- `public/uploads/` 是运行期数据目录，不会提交到仓库
- 如果未来切对象存储，这部分会逐步从“本地持久化目录”转成“URL 指向外部存储”

### `scripts/`

仓库级脚本，面向运维和内容维护。

当前包括：

- 站点备份导出
- 备份导入
- 站点 URL 写入
- 编辑器示例内容生成

### `deploy/`

生产环境辅助配置。

当前是：

- `deploy/Caddyfile`

### `docs/`

仓库文档目录。

建议以后继续把这类内容放这里：

- 部署说明
- SEO 说明
- 数据迁移说明
- 结构设计说明
- 接口或编辑器规范

### `types/`

全局共享类型定义。

如果类型只在某个 feature 内使用，优先放回对应 feature；如果被多个页面、组件、DAO 共用，再提升到这里。

## 代码边界建议

### 页面层

页面文件尽量负责：

- 组装数据
- 组合组件
- 输出 metadata

不要把复杂数据处理长期堆在页面文件里。

### DAO 层

数据库查询统一尽量走 `lib/db/dao/*`。

这样有几个好处：

- 查询逻辑可集中优化
- 缓存策略更容易统一
- API 路由和页面可以复用同一份查询能力

### 组件层

通用展示组件尽量保持“输入明确、输出稳定”，少和具体路由耦合。

例如：

- `PostCard`
- `AnimeGrid`
- `GameGrid`
- `NavBar`

### 脚本与运行数据

不要把这些本地运行产物放进版本库：

- `.next/`
- `node_modules/`
- `public/uploads/`
- `backups/`
- `data/`
- `.env*`

## 当前值得继续优化的地方

- 生产 `Dockerfile` 仍然是“容器启动时再执行 `next build`”，后续建议改成镜像构建阶段完成编译
- 文章、ACG、相册等区域的图片还没有全面统一到 `next/image` 或稳定的优化代理层
- 部分前台和后台页面仍然有较多文件留在 `components/ui/`，后续如果继续变复杂，可以再向 `features/` 回收

## 一条实用原则

如果你在犹豫一个文件该放哪，可以先问自己：

1. 它是页面专属，还是可复用能力？
2. 它更偏展示，还是更偏业务逻辑？
3. 它未来会不会被 API、页面、脚本同时复用？

回答完这三个问题，目录位置通常就比较清楚了。
