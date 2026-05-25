'use client'

import { ArticleRenderer } from '@/components/article/ArticleRenderer'
import type { Heading } from '@/lib/utils/extractHeadings'

interface PostContentProps {
  content: object
  headings: Heading[]
}

export function PostContent({ content, headings }: PostContentProps) {
  return <ArticleRenderer content={content} headings={headings} className="post-content hash-heading-surface" />
}
