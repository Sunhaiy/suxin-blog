'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiArrowGoBackLine,
  RiLoader4Line,
  RiMailLine,
  RiMessage2Line,
  RiSendPlaneLine,
  RiShieldStarLine,
  RiUserLine,
} from '@remixicon/react'

interface CommentRecord {
  id: number
  post_id: number
  author_name: string
  author_email: string | null
  parent_id: number | null
  content: string
  location_label: string | null
  browser_label: string | null
  os_label: string | null
  is_by_author: boolean
  is_approved: boolean
  created_at: string
  reply_to_name?: string | null
}

interface CommentTreeNode extends CommentRecord {
  children: CommentTreeNode[]
}

interface CommentSectionProps {
  postId: number
  viewerIsAuthor?: boolean
  ownerName?: string
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`
  }
  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`
  }

  return `${Math.max(1, Math.floor(diff / day))} 天前`
}

function buildCommentTree(comments: CommentRecord[]) {
  const map = new Map<number, CommentTreeNode>()
  const roots: CommentTreeNode[] = []

  comments.forEach((comment) => {
    map.set(comment.id, { ...comment, children: [] })
  })

  comments.forEach((comment) => {
    const node = map.get(comment.id)
    if (!node) return

    if (comment.parent_id && map.has(comment.parent_id)) {
      map.get(comment.parent_id)?.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function MetaPill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${
        accent
          ? 'border-primary/28 bg-primary/10 text-primary'
          : 'border-border/80 bg-background/55 text-muted-foreground'
      }`}
    >
      {children}
    </span>
  )
}

function CommentItem({
  comment,
  depth = 0,
  onReply,
}: {
  comment: CommentTreeNode
  depth?: number
  onReply: (comment: CommentRecord) => void
}) {
  const badges = [
    comment.location_label,
    comment.os_label,
    comment.browser_label,
  ].filter(Boolean) as string[]

  return (
    <article className={depth > 0 ? 'border-l border-border/70 pl-5' : ''}>
      <div className="rounded-[26px] border border-border/70 bg-card/78 p-5 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/18 bg-primary/10 text-sm font-semibold text-primary">
            {comment.author_name.trim().charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-foreground">{comment.author_name}</span>
              {comment.is_by_author ? (
                <MetaPill accent>
                  <RiShieldStarLine className="mr-1" size={12} />
                  博主
                </MetaPill>
              ) : null}
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              {formatRelativeTime(comment.created_at)}
            </div>

            {comment.reply_to_name ? (
              <p className="mt-3 text-sm text-muted-foreground">
                回复 <span className="text-foreground">@{comment.reply_to_name}</span>：
              </p>
            ) : null}

            <div className="mt-3 whitespace-pre-wrap text-[1rem] leading-8 text-foreground/90">
              {comment.content}
            </div>

            {badges.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <MetaPill key={`${comment.id}-${badge}`}>{badge}</MetaPill>
                ))}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
              >
                <RiArrowGoBackLine size={16} />
                回复
              </button>
            </div>
          </div>
        </div>
      </div>

      {comment.children.length > 0 ? (
        <div className="mt-4 space-y-4">
          {comment.children.map((child) => (
            <CommentItem key={child.id} comment={child} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function CommentSection({
  postId,
  viewerIsAuthor = false,
  ownerName = '',
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<CommentRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store' })
      if (response.ok) {
        setComments(await response.json())
      }
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  useEffect(() => {
    if (viewerIsAuthor && ownerName.trim()) {
      setName(ownerName)
    }
  }, [ownerName, viewerIsAuthor])

  const tree = useMemo(() => buildCommentTree(comments), [comments])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !content.trim()) return

    setSubmitting(true)
    setSubmitState('idle')
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: name.trim(),
          author_email: email.trim(),
          parent_id: replyTo?.id ?? null,
          content: content.trim(),
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : '评论提交失败，请稍后重试。')
      }

      setSubmitState('success')
      setSuccessMsg(
        typeof payload?.message === 'string'
          ? payload.message
          : viewerIsAuthor
            ? '回复已发布。'
            : '评论已提交，审核后会显示在文章下方。'
      )
      setContent('')
      setReplyTo(null)
      if (viewerIsAuthor || payload?.approved) {
        await loadComments()
      }
    } catch (error) {
      setSubmitState('error')
      setErrorMsg(error instanceof Error ? error.message : '评论提交失败。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
          <RiMessage2Line size={18} />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            评论{comments.length > 0 ? ` · ${comments.length}` : ''}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">欢迎留下想法，也可以直接回复某一条评论。</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RiLoader4Line size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : tree.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border/80 bg-card/55 px-5 py-10 text-center text-sm text-muted-foreground">
          还没有评论，来留下第一条吧。
        </div>
      ) : (
        <div className="space-y-5">
          {tree.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onReply={setReplyTo} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-[30px] border border-border/70 bg-card/80 p-6 backdrop-blur-xl sm:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">留下评论</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {viewerIsAuthor
                ? '你当前已登录后台，本次留言会以站长身份直接发布。'
                : '评论提交后会先进入审核队列，通过后再显示在文章下方。'}
            </p>
          </div>

          {replyTo ? (
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded-full border border-primary/18 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/14"
            >
              正在回复 @{replyTo.author_name} · 取消
            </button>
          ) : null}
        </div>

        {submitState === 'success' && successMsg ? (
          <div className="mb-4 rounded-2xl border border-primary/18 bg-primary/10 px-4 py-3 text-sm text-foreground">
            {successMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative">
              <RiUserLine
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={viewerIsAuthor ? '站长身份' : '称呼 *'}
                maxLength={50}
                required
                disabled={viewerIsAuthor}
                className="h-11 w-full rounded-2xl border border-border/75 bg-background/58 pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary/28 focus:ring-2 focus:ring-primary/12"
              />
            </label>

            <label className="relative">
              <RiMailLine
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="邮箱（选填，不公开）"
                className="h-11 w-full rounded-2xl border border-border/75 bg-background/58 pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary/28 focus:ring-2 focus:ring-primary/12"
              />
            </label>
          </div>

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={replyTo ? `回复 @${replyTo.author_name}…` : '写下你的想法…'}
            rows={5}
            maxLength={2000}
            required
            className="min-h-[148px] w-full resize-none rounded-[24px] border border-border/75 bg-background/58 px-4 py-3 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary/28 focus:ring-2 focus:ring-primary/12"
          />

          {submitState === 'error' && errorMsg ? (
            <p className="text-sm text-red-300">{errorMsg}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              提交后会自动记录基础环境信息，用来帮助区分不同访客设备。
            </p>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !content.trim()}
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/18 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RiLoader4Line size={15} className="animate-spin" />
                  提交中
                </>
              ) : (
                <>
                  <RiSendPlaneLine size={15} />
                  提交评论
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
