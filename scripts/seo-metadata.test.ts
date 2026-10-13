import assert from 'node:assert/strict'
import { test } from 'node:test'
import { articleDescription, articleProse, articleTitle, publicPageMetadata } from '../lib/seo/metadata'

test('every public landing page has a useful unique summary and canonical', () => {
  const routes = ['/', '/about', '/anime', '/games', '/gallery', '/links', '/moments', '/posts', '/posts/archive', '/posts/categories', '/posts/tags', '/works', '/acg'] as const
  const descriptions = new Set()
  for (const route of routes) {
    const metadata = publicPageMetadata(route)
    const title = String(metadata.title)
    const description = metadata.description || ''
    assert.ok(title.length >= 15 && title.length <= 60, route)
    assert.ok(description.length >= 70 && description.length <= 160, route)
    assert.equal(metadata.alternates?.canonical, route)
    descriptions.add(description)
  }
  assert.equal(descriptions.size, routes.length)
})

test('article title budgets include the site suffix and preserve Unicode', () => {
  const title = articleTitle('From Pixel to Porcelain: How Linxi SmartModel Turns AI Imagination into Collectible Art', '素心')
  assert.ok(Array.from(title).length <= 65)
  assert.ok(title.endsWith(' | 素心'))
  assert.ok(articleTitle('SEO', '素心').length >= 15)
  assert.ok(!articleTitle('😀'.repeat(80), '素心').includes('\uFFFD'))
})

test('short descriptions use article prose, while useful authored descriptions survive', () => {
  const prose = '这篇文章介绍模型训练中权重和偏置的作用，并通过输入层、隐藏层和输出层的具体例子说明参数如何参与计算。读者可以结合实例理解网络结构，进一步对照训练过程中的预测结果、损失变化与参数调整，建立对神经网络的直观认识。'
  const content = { type: 'doc', content: [
    { type: 'codeBlock', content: [{ type: 'text', text: 'SECRET_CODE_NOISE' }] },
    { type: 'paragraph', attrs: { href: 'https://irrelevant.example' }, content: [{ type: 'text', text: prose }] },
  ] }
  const description = articleDescription('权重和偏置的区别。', null, content)
  assert.ok(description.length >= 70 && description.length <= 160)
  assert.ok(!description.includes('SECRET_CODE_NOISE'))
  assert.ok(!description.includes('irrelevant.example'))
  assert.equal(articleDescription(prose, null, content), prose)
  assert.equal(articleProse(null), '')
  assert.ok(articleDescription('内容'.repeat(150), null, content).length <= 160)
})
