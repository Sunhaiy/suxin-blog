'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AdminEmptyState,
  AdminListToolbar,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  ADMIN_INPUT_CLASS,
} from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

interface CategoryItem {
  category: string
  count: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const response = await fetch('/api/categories')
    const payload = await response.json()
    setCategories(payload)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (editingName !== null) inputRef.current?.focus()
  }, [editingName])

  async function handleRename(oldName: string) {
    const newName = editValue.trim()
    if (!newName || newName === oldName) {
      setEditingName(null)
      return
    }

    setBusy(true)
    setError('')

    const response = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    })

    if (response.ok) {
      setEditingName(null)
      await load()
    } else {
      setError('分类重命名失败。')
    }

    setBusy(false)
  }

  async function handleDelete(name: string) {
    if (!confirm(`确认删除分类“${name}”吗？该分类下的文章会自动归入“未分类”。`)) return

    setBusy(true)
    setError('')

    const response = await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    if (response.ok) {
      await load()
    } else {
      setError('分类删除失败。')
    }

    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Content Taxonomy"
        title="分类管理"
        description="统一整理文章分类，保留轻量编辑流程，同时避免误删影响内容结构。"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/dashboard/posts">
              <MaterialSymbol icon="article" size={18} />
              返回文章
            </Link>
          </Button>
        }
        meta={<AdminStatusBadge tone="neutral">分类 {categories.length}</AdminStatusBadge>}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4">
          <div className="h-16 animate-pulse rounded-xl border border-border bg-card/70" />
          <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-card/70" />
        </div>
      ) : categories.length === 0 ? (
        <AdminEmptyState
          icon="folder"
          title="还没有分类"
          description="发布文章时使用新分类，这里就会开始形成可维护的目录。"
        />
      ) : (
        <>
          <AdminListToolbar className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone="neutral">总数 {categories.length}</AdminStatusBadge>
              <AdminStatusBadge tone="accent">默认保留 未分类</AdminStatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">删除分类不会删除文章，文章会自动回落到“未分类”。</p>
          </AdminListToolbar>

          <AdminPanel
            title="分类列表"
            description="在这里维护名称与文章数量，后续批量工具可以沿用这一套表格结构。"
            icon="folder_managed"
            bodyClassName="overflow-hidden p-0"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_120px_220px] border-b border-border/70 bg-background/40 px-6 py-4 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
              <span>分类名称</span>
              <span className="text-right">文章数</span>
              <span className="text-right">操作</span>
            </div>

            {categories.map(({ category, count }) => {
              const isDefault = category === '未分类'
              const isEditing = editingName === category

              return (
                <div
                  key={category}
                  className="grid grid-cols-[minmax(0,1fr)_120px_220px] items-center gap-4 border-b border-border/65 px-6 py-4 last:border-b-0"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleRename(category)
                          if (event.key === 'Escape') setEditingName(null)
                        }}
                        className={ADMIN_INPUT_CLASS}
                        disabled={busy}
                      />
                      <Button onClick={() => handleRename(category)} disabled={busy}>
                        确认
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingName(null)} disabled={busy}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{category}</p>
                        {isDefault ? <AdminStatusBadge tone="neutral">默认</AdminStatusBadge> : null}
                      </div>
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
                            setEditingName(category)
                            setEditValue(category)
                          }}
                        >
                          <MaterialSymbol icon="edit" size={18} />
                          重命名
                        </Button>
                        {!isDefault ? (
                          <Button variant="danger" disabled={busy} onClick={() => handleDelete(category)}>
                            <MaterialSymbol icon="delete" size={18} />
                            删除
                          </Button>
                        ) : null}
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
