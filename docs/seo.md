# SEO 配置说明

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
