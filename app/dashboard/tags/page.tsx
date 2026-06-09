'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AdminEmptyState,
  AdminListToolbar,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  ADMIN_INPUT_CLASS,
} from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

interface TagItem {
  tag: string
  count: number
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tags')
      const payload = await response.json().catch(() => [])

      if (!response.ok) {
        throw new Error('标签列表加载失败')
      }

      setTags(Array.isArray(payload) ? payload : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '标签列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (editingName !== null) inputRef.current?.focus()
  }, [editingName])

  async function handleRename(oldName: string) {
    const newName = editValue.trim()

    if (!newName || newName === oldName) {
      setEditingName(null)
      setEditValue('')
      return
    }

    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      })

      if (!response.ok) {
        throw new Error('标签重命名失败')
      }

      setEditingName(null)
      setEditValue('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '标签重命名失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`确认删除标签“${name}”吗？它会从所有文章中一并移除。`)) return

    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error('标签删除失败')
      }

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '标签删除失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Content Taxonomy"
        title="标签管理"
        description="统一维护文章标签，清理乱码标签、合并同义标签，让前台标签页和筛选器都更干净。"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/dashboard/posts">
              <MaterialSymbol icon="article" size={18} />
              返回文章
            </Link>
          </Button>
        }
        meta={<AdminStatusBadge tone="neutral">标签 {tags.length}</AdminStatusBadge>}
      />

      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

      {loading ? (
        <div className="grid gap-4">
          <div className="h-16 animate-pulse rounded-xl border border-border bg-card/70" />
          <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-card/70" />
        </div>
      ) : tags.length === 0 ? (
        <AdminEmptyState
          icon="sell"
          title="还没有标签"
          description="文章开始使用标签后，这里就会自动形成一份可维护的标签列表。"
        />
      ) : (
        <>
          <AdminListToolbar className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone="neutral">总数 {tags.length}</AdminStatusBadge>
              <AdminStatusBadge tone="accent">可重命名 / 可删除</AdminStatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              删除标签不会删除文章，只会把这个标签从文章标签数组里移除。
            </p>
          </AdminListToolbar>

          <AdminPanel
            title="标签列表"
            description="适合清理乱码标签、统一大小写和合并近义词。"
            icon="sell"
            bodyClassName="overflow-hidden p-0"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_120px_220px] border-b border-border/70 bg-background/40 px-6 py-4 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
              <span>标签名称</span>
              <span className="text-right">文章数</span>
              <span className="text-right">操作</span>
            </div>

            {tags.map(({ tag, count }) => {
              const isEditing = editingName === tag

              return (
                <div
                  key={tag}
                  className="grid grid-cols-[minmax(0,1fr)_120px_220px] items-center gap-4 border-b border-border/65 px-6 py-4 last:border-b-0"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void handleRename(tag)
                          if (event.key === 'Escape') {
                            setEditingName(null)
                            setEditValue('')
                          }
                        }}
                        className={ADMIN_INPUT_CLASS}
                        disabled={busy}
                      />
                      <Button onClick={() => void handleRename(tag)} disabled={busy}>
                        确认
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingName(null)
                          setEditValue('')
                        }}
                        disabled={busy}
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{tag}</p>
                    </div>
                  )}

                  <p className="text-right text-sm font-mono text-muted-foreground">{count}</p>

                  <div className="flex justify-end gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setEditingName(tag)
                            setEditValue(tag)
                          }}
                        >
                          <MaterialSymbol icon="edit" size={18} />
                          重命名
                        </Button>
                        <Button variant="danger" disabled={busy} onClick={() => void handleDelete(tag)}>
                          <MaterialSymbol icon="delete" size={18} />
                          删除
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </AdminPanel>
        </>
      )}
    </div>
  )
}
