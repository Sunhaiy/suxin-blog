# SEO 配置说明

## 2026-10 SEO 修复与回归检查

- 栏目页的标题、描述、canonical 和分享摘要集中在 `lib/seo/metadata.ts`，不再继承个人简介作为页面描述，也不重复拼接站名。
- 文章保留原始正文标题，搜索标题连同站名控制在 65 个 Unicode 字符以内。短描述从文章正文补充，排除代码块和编辑器属性，最多 160 字符；不会为了凑长度生成无关内容。
- 关于页使用原有姓名作为 H1。沉浸式栏目保留原视觉布局，通过屏幕阅读器可见的页面标题补齐语义。
- 筛选结果使用 `noindex, follow`，正常文章分页保留独立 canonical。管理登录页禁止索引。
- 站点地图只包含可索引页面，删除会跳转的旧作品详情地址；旧链接永久跳转到作品集。不再把每次生成地图的时间当作静态页面的修改时间。文章的 `updated_at` 也会被阅读计数触发器更新，因此暂不输出不可靠的 `lastmod`；以后引入只随内容变化的时间戳后再恢复。

验证命令：

```bash
npm run test:seo
npx tsc --noEmit
npm run lint
python scripts/audit-seo.py https://haiy.space --output output/seo-audit.json
```

临时实例可增加 `--origin http://127.0.0.1:13000`，使用生产站点的 sitemap URL 与 canonical，但请求临时实例。HTTP 检查使用 Bingbot User-Agent，检查服务端 HTML 中的标题、描述、H1、canonical、索引指令及重定向。

本次部署前保留了本地未提交改动（Git stash：`backup-local-before-production-seo-2026-10-13`）。服务器源码备份位于 `/opt/suxin-backups/blog-source-before-seo-20261013.tar.gz`，旧应用镜像标记为 `suxin-blog-app:before-seo-20261013`。数据库、上传目录和生产环境变量未作迁移或覆盖。

线上复测额外发现 10 篇旧文章的 `seo_title` 等于原始标题加上 ` | ???????`。已备份到 `/opt/suxin-backups/seo-title-values-before-20261013.json`，仅将这些 SEO 字段恢复为原始标题，保留正文和文章标题。检查脚本也会检测这种损坏的后缀，避免仅满足长度检查却输出乱码。文章查询缓存最多需要约 5 分钟刷新。

检查脚本使用标题 15–65 字符、描述 70–160 字符作为本站的编辑检查范围，不代表搜索排名规则，也不能代替 Bing 后台复查。中文搜索摘要尤其需要兼顾阅读体验，不应为满足英文长度建议堆砌关键词。

“Limited crawl capacity”还涉及搜索引擎分配的抓取预算与后台 Crawl Control 设置。本站 robots.txt 不设置 Crawl-delay，公开内容允许抓取；应结合 Bing 最新抓取结果、服务器错误率和响应时间确认恢复，不能只凭部署成功认定告警已消失。

参考：[Bing 抓取控制](https://www.bing.com/webmasters/help/crawl-control-55a30303)、[Bing 站长指南](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)、[Google 摘要说明](https://developers.google.com/search/docs/appearance/snippet)。

这份文档说明项目当前已经内置的 SEO 能力，以及 Google、Bing、百度三个平台上线后还需要补的配置。

## 项目已内置

- `sitemap.xml`
- `robots.txt`
- RSS 输出
- 页面级 `metadata`
- 文章 canonical / Open Graph / Twitter Card
- IndexNow 自动提交
- 百度普通收录自动提交
- 后台手动补提接口

相关文件：

- `app/sitemap.ts`
- `app/robots.ts`
- `app/rss.xml/route.ts`
- `app/layout.tsx`
- `app/indexnow-key.txt/route.ts`
- `lib/seo/submission.ts`
- `app/api/seo/submit/route.ts`

## 自动提交的工作方式

当文章发生这些变化时，系统会尝试通知搜索引擎：

- 新发布
- 已发布文章更新
- 已发布文章修改 slug
- 已发布文章删除

当前支持：

- `IndexNow`
- `百度普通收录 API`

Google 不在这套自动提交通道里。普通博客文章没有通用的 Google 推送 API，核心仍然是 `sitemap + 正常抓取 + Search Console`。

## 需要配置的环境变量

### 站点验证

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `MICROSOFT_CLARITY_ID`

它们分别对应平台给你的 HTML 标签验证 `content` 值：

- Google Search Console：`google-site-verification`
- Bing Webmaster Tools：`msvalidate.01`
- 百度搜索资源平台：`baidu-site-verification`

填入后，项目会自动把验证标签输出到全站 `<head>`。

### Microsoft Clarity

- `MICROSOFT_CLARITY_ID`

填入后，项目会在全站注入 Microsoft Clarity 脚本，用于热力图、会话录制和行为分析。该能力不会影响 Bing 收录，但非常适合和 Bing Webmaster Tools 一起使用。

### 自动提交总开关

- `SEARCH_SUBMIT_ENABLED`

推荐保持：

```env
SEARCH_SUBMIT_ENABLED="true"
```

### IndexNow

- `INDEXNOW_KEY`
- `INDEXNOW_ENDPOINT` 可选
- `INDEXNOW_KEY_LOCATION` 可选

当 `INDEXNOW_KEY` 存在时：

- 项目会暴露 `/indexnow-key.txt`
- 发布或更新文章时会自动向 IndexNow 提交 URL

### 百度普通收录

- `BAIDU_TOKEN`
- `BAIDU_SITE`
- `BAIDU_SUBMIT_ENDPOINT` 可选
- `BAIDU_SUBMIT_TYPE` 可选

如果没有 `BAIDU_TOKEN`：

- 百度自动推送会跳过
- 其他 SEO 能力仍然正常工作

## 三个平台怎么接

### Google Search Console

需要你手动做：

1. 添加站点
2. 选择验证方式
3. 如果选 HTML 标签验证，把 `content` 值写入 `GOOGLE_SITE_VERIFICATION`
4. 提交 `https://你的域名/sitemap.xml`

Google 对普通内容的核心仍然是：

- `sitemap`
- 站内链接
- 正常抓取
- Search Console 中的覆盖率与 URL 检查

### Bing Webmaster Tools

建议这样做：

1. 添加站点
2. 如果你已验证 Google Search Console，可以直接导入并自动验证
3. 或者选择 Meta tag 验证，把 `content` 值写入 `BING_SITE_VERIFICATION`
4. 提交 `sitemap.xml`
5. 保持 `IndexNow` 开启

### 百度搜索资源平台

建议这样做：

1. 添加站点
2. 选择文件验证或 HTML 标签验证
3. 如果选 HTML 标签验证，把 `content` 值写入 `BAIDU_SITE_VERIFICATION`
4. 提交 `sitemap.xml`
5. 获取普通收录 API token
6. 把 token 写入 `BAIDU_TOKEN`

## 手动补提接口

系统提供了后台登录态下的手动补提接口：

```http
POST /api/seo/submit
```

常见请求：

```json
{
  "allPublished": true
}
```

也可以只补提一部分：

```json
{
  "slugs": ["my-post-slug"],
  "ids": [12],
  "urls": ["https://example.com/posts/my-post-slug"]
}
```

## 推荐上线顺序

1. 确认 `AUTH_URL`、`NEXT_PUBLIC_BASE_URL`、后台站点设置里的 `siteUrl` 都是正式域名
2. 打开 `sitemap.xml` 和 `robots.txt`，确认可访问
3. 配好 `GOOGLE_SITE_VERIFICATION`
4. 配好 `BING_SITE_VERIFICATION`
5. 配好 `BAIDU_SITE_VERIFICATION`
6. 配好 `INDEXNOW_KEY`
7. 配好 `BAIDU_SITE` 和 `BAIDU_TOKEN`
8. 到 Google / Bing / 百度各自平台完成验证
9. 各提交一次 `sitemap.xml`
10. 对历史已发布文章执行一次手动补推

## 是否要每篇都手动提交

通常不需要。

更合理的方式是：

- 平时依赖 `sitemap + 自动提交`
- 对特别重要、或者长时间没收录的页面，再手动检查与补提

## 后续还能增强

- 给文章页补 `BlogPosting`、`BreadcrumbList` 结构化数据
- 当内容量变大后，把 `sitemap` 拆成 `sitemap index`
- 把 SEO 提交结果回写到后台，做可视化追踪
