import type { Metadata } from 'next'

// Editorial budgets, not ranking rules. Keep snippets useful rather than padding keywords.
export const TITLE_MAX_LENGTH = 65
export const DESCRIPTION_MAX_LENGTH = 160
export const DESCRIPTION_MIN_LENGTH = 70

export function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function shorten(value: string, limit: number) {
  const characters = Array.from(compactText(value))
  if (characters.length <= limit) return characters.join('')
  return `${characters.slice(0, limit - 1).join('').trimEnd()}…`
}

export function articleTitle(title: string, siteName: string, category?: string | null) {
  let subject = compactText(title)
  if (Array.from(subject).length < 10) {
    subject += category ? `：${category}学习笔记与实践记录` : '：学习笔记与实践记录'
  }
  const suffix = ` | ${shorten(siteName, 20)}`
  return `${shorten(subject, TITLE_MAX_LENGTH - Array.from(suffix).length)}${suffix}`
}

// Read prose only: code, URLs and editor attributes are not search summaries.
export function articleProse(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const node = content as { type?: string; text?: string; content?: unknown[] }
  if (['codeBlock', 'image', 'video', 'audio'].includes(node.type ?? '')) return ''
  if (typeof node.text === 'string') return node.text
  return (node.content ?? []).map(articleProse).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ')
}

export function articleDescription(preferred: string | null, excerpt: string | null, content: unknown) {
  let description = compactText(preferred || excerpt || '')
  const prose = compactText(articleProse(content))
  if (Array.from(description).length < DESCRIPTION_MIN_LENGTH && prose) {
    description = description && !prose.startsWith(description)
      ? `${description}${/[。！？.!?]$/.test(description) ? ' ' : '。'}${prose}`
      : prose
  }
  return shorten(description, DESCRIPTION_MAX_LENGTH)
}

const pages = {
  '/': ['孙海洋的个人博客：技术实践、独立开发与生活记录', '素心是孙海洋的个人博客，记录全栈开发、人工智能学习与独立产品实践。在这里可以阅读技术文章，了解项目作品，浏览照片、日常瞬间和兴趣收藏，也可以通过归档、分类与标签查找感兴趣的内容，跟随持续学习和创作的足迹。'],
  '/about': ['关于孙海洋：全栈开发、独立作品与个人介绍', '了解素心博客作者孙海洋的技术背景、核心能力与独立开发经历。本页展示前端、后端、移动应用及人工智能方向的实践，介绍精选项目、设计理念和生活兴趣，从真实作品与日常记录认识这个网站背后的创作者。'],
  '/anime': ['动漫追番记录：在看、已看与计划观看的作品', '这里是素心的动漫追番记录，整理正在观看、已经看完与计划观看的动画作品。通过作品封面、观看状态和个人收藏回顾喜欢的故事与角色，记录追番进度，也为下一次想看什么留下一份可以慢慢浏览的兴趣清单。'],
  '/games': ['游戏收藏记录：游玩进度、通关与心愿清单', '这里收录素心玩过、正在玩与准备开启的游戏，以封面和游玩状态整理个人游戏收藏。浏览通关、白金与进行中的作品，回顾不同游戏带来的体验与记忆，也可以从这份持续更新的清单中发现值得关注的作品。'],
  '/gallery': ['摄影相册与影像收藏：生活片段和日常风景', '素心相册收集日常生活中的照片与值得留下的画面，以沉浸式画廊呈现不同时间和场景里的影像。你可以按相册浏览收藏，查看照片细节，在风景、光影和生活片段之间慢慢切换，用另一种方式了解文字之外的日常。'],
  '/links': ['友情链接与网站收藏：博客、工具和学习资源', '这里收藏素心常常访问的个人博客、实用工具、学习资源与灵感网站，按不同用途整理，方便寻找值得停留和探索的网络角落。页面同时提供本站信息与友链申请入口，欢迎认真创作、持续更新的独立站点交流与互访。'],
  '/moments': ['日常瞬间与生活随记：照片、心情和所见所想', '这里记录素心生活中短暂却值得留下的瞬间，包括随手拍下的照片、日常心情、天气变化与路过的小事。相比完整的技术文章，这些简短随记更贴近当时的感受，沿着时间顺序浏览，可以看见学习、工作和生活之间的细小片段。'],
  '/posts': ['技术文章与学习笔记：开发实践和经验分享', '浏览素心博客公开发布的技术文章与学习笔记，内容涵盖全栈开发、人工智能、工具使用和独立项目实践。支持通过分类、标签及关键词查找内容，也可以从推荐阅读与文章列表出发，了解每个问题的思路、过程与经验。'],
  '/posts/archive': ['文章时间归档：按年月回顾技术与生活记录', '按照发布时间回顾素心博客的全部公开文章，在不同年份和月份之间寻找技术学习、项目实践与日常记录。时间归档保留了持续写作的脉络，适合查找曾经读过的内容，也适合从早期笔记开始了解一个主题逐渐展开的过程。'],
  '/posts/categories': ['文章分类导航：按主题探索技术与实践笔记', '通过分类导航浏览素心博客的公开文章，按不同内容主题寻找开发实践、学习笔记与经验记录。每个分类连接对应的文章列表，帮助你从关心的方向开始阅读，减少在全部内容中逐篇寻找的时间，也便于发现相关主题的新文章。'],
  '/posts/tags': ['文章标签索引：查找技术关键词与相关内容', '通过标签索引探索素心博客的技术文章与个人笔记，围绕具体关键词寻找相关内容。标签把不同分类中的共同主题联系起来，适合追踪某项技术、工具或学习话题，也可以作为继续阅读的入口，发现文章之间的联系与延伸方向。'],
  '/works': ['独立开发项目作品集：产品介绍与开源实践', '素心项目作品集展示持续打磨的独立开发作品，通过项目介绍、技术标签和预览了解每个产品的方向与特点。你可以浏览不同作品，访问提供的项目链接，并查看已关联开源仓库的近期活动，了解从想法到实际产品的创作过程。'],
  '/acg': ['数字陈列室：动漫追番与游戏收藏兴趣清单', '数字陈列室集中展示素心的动漫追番与游戏收藏，把喜欢的故事、角色和互动体验整理在同一处。这里可以浏览动画观看状态与游戏游玩进度，回顾已经完成的作品，也可以看看正在追看、正在游玩和准备探索的兴趣清单。'],
} satisfies Record<string, [string, string]>

export function publicPageMetadata(path: keyof typeof pages): Metadata {
  const [title, description] = pages[path]
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', locale: 'zh_CN', title, description, url: path },
    twitter: { card: 'summary', title, description },
  }
}
