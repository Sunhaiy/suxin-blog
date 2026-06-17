'use client'

import { useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from '@/components/admin/AdminPrimitives'
import { AdminDialog } from '@/components/admin/AdminDialog'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { TiptapEditor } from '@/features/editor/TiptapEditor'
import { useCreateMoment, useDeleteMoment, useMoments, useUpdateMoment } from '@/features/moments/hooks'
import { extractPlainTextFromRichContent } from '@/lib/utils/extractHeadings'
import type { MomentRow, MomentType } from '@/types/moment'

const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

type EditableMoment = Pick<
  MomentRow,
  'id' | 'type' | 'content' | 'content_json' | 'is_public' | 'created_at' | 'mood' | 'location' | 'weather'
>

export default function DashboardMomentsPage() {
  const { data, isLoading, mutate } = useMoments({ pageSize: 40 })
  const { trigger: createMoment, isMutating: creating } = useCreateMoment()
  const { trigger: deleteMoment } = useDeleteMoment()
  const [activeMoment, setActiveMoment] = useState<EditableMoment | null>(null)
  const { trigger: updateMoment, isMutating: updating } = useUpdateMoment(activeMoment?.id ?? 0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [type, setType] = useState<MomentType>('text')
  const [isPublic, setIsPublic] = useState(true)
  const [content, setContent] = useState<JSONContent>(EMPTY_DOC)
  const [error, setError] = useState('')

  const moments = (data?.data ?? []) as MomentRow[]
  const saving = creating || updating
  const plainText = useMemo(() => extractPlainTextFromRichContent(content), [content])

  function openNew() {
    setActiveMoment(null)
    setType('text')
    setIsPublic(true)
    setContent(EMPTY_DOC)
    setError('')
    setDialogOpen(true)
  }

  function openEdit(moment: EditableMoment) {
    setActiveMoment(moment)
    setType(moment.type)
    setIsPublic(moment.is_public)
    setContent(moment.content_json ?? buildFallbackMomentDoc(moment.content))
    setError('')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setActiveMoment(null)
    setError('')
  }

  async function handleSave() {
    if (!plainText.trim()) {
      setError('瞬间内容不能为空')
      return
    }

    setError('')
    const payload = { type, contentJson: content, isPublic }

    try {
      if (activeMoment) {
        await updateMoment(payload)
      } else {
        await createMoment(payload)
      }
      await mutate()
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存瞬间失败')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确认删除这条瞬间吗？')) return

    try {
      await deleteMoment(id)
      await mutate()
      if (activeMoment?.id === id) closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除瞬间失败')
    }
  }

  const publicCount = moments.filter((m) => m.is_public).length

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="瞬间"
        actions={
          <Button size="sm" onClick={openNew}>
            <MaterialSymbol icon="edit_note" size={16} />
            写瞬间
          </Button>
        }
        meta={
          <>
            <AdminStatusBadge tone="accent">{moments.length} 条记录</AdminStatusBadge>
            <AdminStatusBadge>{publicCount} 条公开</AdminStatusBadge>
          </>
        }
      />

      <AdminPanel title="历史记录">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl border border-border/70 bg-background/38" />
            ))}
          </div>
        ) : moments.length === 0 ? (
          <AdminEmptyState
            icon="ink_pen"
            title="还没有瞬间"
            description="先写下第一条记录，后台就会在这里接住它。"
            action={<Button size="sm" onClick={openNew}>写第一条</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70">
            {moments.map((moment) => {
              const preview = moment.content_json
                ? extractPlainTextFromRichContent(moment.content_json)
                : moment.content ?? ''

              return (
                <div
                  key={moment.id}
                  className="flex items-start gap-3 border-b border-border/60 bg-background/22 px-4 py-3 last:border-b-0 hover:bg-background/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge tone={moment.is_public ? 'success' : 'warning'}>
                        {moment.is_public ? '公开' : '私密'}
                      </AdminStatusBadge>
                      <span className="font-mono text-xs text-muted-foreground/70">
                        {new Date(moment.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-foreground/80">
                      {preview || '（无可预览内容）'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(moment)}>
                      编辑
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleDelete(moment.id)} className="text-red-400 hover:text-red-300">
                      删除
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </AdminPanel>

      <AdminDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={activeMoment ? '编辑瞬间' : '写瞬间'}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {activeMoment ? (
                <Button variant="ghost" onClick={() => void handleDelete(activeMoment.id)}>
                  <MaterialSymbol icon="delete" size={16} />
                  删除
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-full border border-border/70 bg-background/50 p-0.5">
                {[
                  { label: '公开', value: true },
                  { label: '私密', value: false },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setIsPublic(item.value)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                      isPublic === item.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Button onClick={() => void handleSave()} loading={saving} disabled={!plainText.trim()}>
                <MaterialSymbol icon="send" size={16} />
                {activeMoment ? '更新' : '发布'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <TiptapEditor
            key={activeMoment ? `moment-${activeMoment.id}` : 'moment-new'}
            initialContent={content}
            onChange={setContent}
            toolbarPreset="lite"
            placeholder="把这一刻写下来：可以是几句完整的话，也可以是带图片、列表或代码的小记录。"
            className="max-w-none"
          />
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
        </div>
      </AdminDialog>
    </div>
  )
}

function buildFallbackMomentDoc(content: string | null): JSONContent {
  if (!content?.trim()) return EMPTY_DOC

  return {
    type: 'doc',
    content: content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: p }],
      })),
  }
}
