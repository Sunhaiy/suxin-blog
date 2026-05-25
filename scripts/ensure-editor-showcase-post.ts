import fs from 'node:fs'
import path from 'node:path'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function textNode(text: string, marks?: Array<Record<string, unknown>>) {
  return { type: 'text', text, ...(marks ? { marks } : {}) }
}

function paragraph(content: Array<string | ReturnType<typeof textNode>>) {
  return {
    type: 'paragraph',
    content: content.map((item) => (typeof item === 'string' ? textNode(item) : item)),
  }
}

function heading(level: number, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [textNode(text)],
  }
}

function listItem(text: string) {
  return {
    type: 'listItem',
    content: [
      {
        type: 'paragraph',
        content: [textNode(text)],
      },
    ],
  }
}

function dataUriPreview() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c1512"/>
          <stop offset="55%" stop-color="#111111"/>
          <stop offset="100%" stop-color="#0b2d22"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="900" rx="48" fill="url(#bg)"/>
      <rect x="96" y="96" width="1408" height="708" rx="36" fill="none" stroke="rgba(255,255,255,0.14)"/>
      <text x="140" y="210" fill="#7ee0be" font-size="32" font-family="Inter, Arial, sans-serif" letter-spacing="12">EDITOR SHOWCASE</text>
      <text x="140" y="330" fill="#f6f7f8" font-size="96" font-weight="700" font-family="Inter, Arial, sans-serif">编辑器组件总览</text>
      <text x="140" y="420" fill="rgba(246,247,248,0.78)" font-size="34" font-family="Inter, Arial, sans-serif">用于检查标题、列表、代码块、图片、引用和链接的展示效果。</text>
      <circle cx="1360" cy="210" r="88" fill="rgba(126,224,190,0.14)"/>
      <circle cx="1280" cy="690" r="120" fill="rgba(126,224,190,0.08)"/>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

async function main() {
  loadEnv(path.join(process.cwd(), '.env.local'))

  const { query } = await import('../lib/db')

  const coverUrl = dataUriPreview()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://haiy.space'

  const content = {
    type: 'doc',
    content: [
      heading(2, '标题层级'),
      paragraph([
        '这篇文章用于集中查看编辑器支持的常用组件，包括 ',
        textNode('粗体', [{ type: 'bold' }]),
        '、',
        textNode('斜体', [{ type: 'italic' }]),
        '、',
        textNode('行内代码', [{ type: 'code' }]),
        ' 和 ',
        textNode('外部链接', [
          {
            type: 'link',
            attrs: { href: siteUrl, target: '_blank', rel: 'noopener noreferrer nofollow' },
          },
        ]),
        '。',
      ]),
      heading(3, '列表与引用'),
      {
        type: 'bulletList',
        content: [
          listItem('无序列表适合记录要点'),
          listItem('每一项都应该保持清晰、均匀的阅读节奏'),
          listItem('适合总结、清单和注意事项'),
        ],
      },
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          listItem('第一步：写下问题背景'),
          listItem('第二步：拆分方案与实现'),
          listItem('第三步：补充验证与结论'),
        ],
      },
      {
        type: 'blockquote',
        content: [
          paragraph(['好的编辑器不应该喧宾夺主，而应该让内容本身更清楚地出现。']),
        ],
      },
      heading(3, '代码块'),
      {
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [
          textNode(`export async function GET() {
  return Response.json({
    ok: true,
    source: 'editor-showcase',
  })
}`),
        ],
      },
      {
        type: 'horizontalRule',
      },
      heading(3, '图片与说明'),
      {
        type: 'image',
        attrs: {
          src: coverUrl,
          alt: '编辑器组件演示图',
          title: '编辑器组件演示图',
        },
      },
      paragraph(['图片节点会直接读取当前站点可用的媒体地址，用来检查圆角、边框和投影效果。']),
    ],
  }

  const payload = {
    title: '编辑器组件演示清单',
    slug: 'editor-showcase',
    content,
    excerpt: '集中展示当前文章编辑器支持的标题、列表、代码块、图片、引用与链接效果。',
    coverUrl,
    coverAlt: '编辑器组件演示清单封面',
    seoTitle: '编辑器组件演示清单',
    seoDescription: '一篇专门用于检查编辑器常用组件在前台展示效果的文章。',
    status: 'published' as const,
    tags: ['编辑器', '演示', '站点维护'],
    category: '站点维护',
    isFeatured: false,
  }

  const existingResult = await query<{ id: number }>('SELECT id FROM posts WHERE slug = $1 LIMIT 1', [
    payload.slug,
  ])
  const existing = existingResult.rows[0] ?? null
  if (existing) {
    await query(
      `UPDATE posts
       SET title = $2,
           content = $3,
           excerpt = $4,
           cover_url = $5,
           cover_alt = $6,
           seo_title = $7,
           seo_description = $8,
           is_featured = $9,
           status = $10,
           tags = $11,
           category = $12,
           updated_at = NOW(),
           published_at = CASE WHEN $10 = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END
       WHERE id = $1`,
      [
        existing.id,
        payload.title,
        JSON.stringify(payload.content),
        payload.excerpt,
        payload.coverUrl,
        payload.coverAlt,
        payload.seoTitle,
        payload.seoDescription,
        payload.isFeatured,
        payload.status,
        payload.tags,
        payload.category,
      ]
    )
    console.log('[editor-showcase] Updated existing post:', existing.id)
  } else {
    const created = await query<{ id: number }>(
      `INSERT INTO posts (
         title,
         slug,
         content,
         excerpt,
         cover_url,
         cover_alt,
         seo_title,
         seo_description,
         is_featured,
         status,
         tags,
         category,
         published_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $10 = 'published' THEN NOW() ELSE NULL END)
       RETURNING id`,
      [
        payload.title,
        payload.slug,
        JSON.stringify(payload.content),
        payload.excerpt,
        payload.coverUrl,
        payload.coverAlt,
        payload.seoTitle,
        payload.seoDescription,
        payload.isFeatured,
        payload.status,
        payload.tags,
        payload.category,
      ]
    )
    console.log('[editor-showcase] Created post:', created.rows[0]?.id)
  }
}

main().catch((error) => {
  console.error('[editor-showcase] Failed:', error)
  process.exit(1)
})
