# SEO 配置说明

这份文档解释当前仓库已经内置了哪些 SEO 能力，以及上线后还需要做哪些平台配置。

## 仓库内置能力

当前仓库已经具备这些基础能力：

- `sitemap.xml`
- `robots.txt`
- RSS 输出
- 页面级 `metadata`
- 文章 canonical / Open Graph / Twitter Card
- IndexNow 自动提交
- 百度普通收录自动提交
- 后台手动补提接口

相关位置：

- `app/sitemap.ts`
- `app/robots.ts`
- `app/rss.xml/route.ts`
- `lib/seo/submission.ts`
- `app/api/seo/submit/route.ts`
- `app/indexnow-key.txt/route.ts`

## 自动提交的工作方式

当文章发生这些动作时，系统会尝试触发搜索引擎提交通道：

- 新发布
- 已发布文章更新
- 已发布文章改 slug
- 已发布文章删除

目前支持的通道：

- `IndexNow`
- `百度普通收录 API`

Google 不在这套自动 API 提交范围内，因为普通博客文章没有通用的 Google 推送接口。

## 需要配置的环境变量

### 总开关

- `SEARCH_SUBMIT_ENABLED`

默认可设为：

```env
SEARCH_SUBMIT_ENABLED="true"
```

### IndexNow

- `INDEXNOW_KEY`
- `INDEXNOW_ENDPOINT` 可选
- `INDEXNOW_KEY_LOCATION` 可选

当 `INDEXNOW_KEY` 存在时：

- 系统会暴露 `/indexnow-key.txt`
- 发布文章后会向 IndexNow 提交 URL

### 百度

- `BAIDU_TOKEN`
- `BAIDU_SITE`
- `BAIDU_SUBMIT_ENDPOINT` 可选
- `BAIDU_SUBMIT_TYPE` 可选

如果没有 `BAIDU_TOKEN`：

- 百度推送会自动跳过
- 其他 SEO 能力仍然照常工作

## 平台侧需要做的事

### Google Search Console

需要你手动做：

1. 添加站点
2. 验证域名或 URL 前缀
3. 提交 `https://你的域名/sitemap.xml`

Google 对普通文章主要还是：

- sitemap
- 内链
- 正常抓取

### Bing Webmaster

建议做：

1. 添加并验证站点
2. 提交 `sitemap.xml`
3. 配合启用的 `IndexNow` 使用

### 百度搜索资源平台

建议做：

1. 添加并验证站点
2. 提交 `sitemap.xml`
3. 获取普通收录 API token
4. 把 token 写入 `BAIDU_TOKEN`

## 手动补提接口

系统提供了后台登录态下的手动补提接口：

```http
POST /api/seo/submit
```

常见请求体：

```json
{
  "allPublished": true
}
```

也可以只提交一部分：

```json
{
  "slugs": ["my-post-slug"],
  "ids": [12],
  "urls": ["https://example.com/posts/my-post-slug"]
}
```

## 推荐上线动作

网站第一次上线后，推荐顺序是：

1. 确认 `AUTH_URL`、`NEXT_PUBLIC_BASE_URL`、站点设置里的 `siteUrl` 都是正式域名
2. 打开 `sitemap.xml` 与 `robots.txt` 检查是否可访问
3. 配好 `INDEXNOW_KEY`
4. 配好 `BAIDU_SITE` 和 `BAIDU_TOKEN`
5. 到 Google / Bing / 百度各自平台完成站点验证
6. 各提交一次 `sitemap.xml`
7. 对历史已发布文章执行一次手动补提

## 对“要不要每篇手动提交”的建议

通常不需要每发一篇文章都手工去三家平台各提一次。

更合理的方式是：

- 平时靠 `sitemap + 自动提交`
- 特别重要的页面，或者长时间没收录的页面，再手工检查和补提

## 后续还能继续增强的方向

- 给文章页补 `BlogPosting`、`BreadcrumbList` 等结构化数据
- 当内容量明显增大后，把 sitemap 拆成 sitemap index
- 把 SEO 推送状态回写到后台，形成可视化追踪

这些都不是当前仓库上线的前置条件，但会是后续很值得做的增强项。
