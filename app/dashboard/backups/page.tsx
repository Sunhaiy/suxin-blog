'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import useSWR from 'swr'
import { AdminDialog } from '@/components/admin/AdminDialog'
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  ADMIN_INPUT_CLASS,
} from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

type BackupKind = 'automatic' | 'manual' | 'safety'

interface BackupFile {
  name: string
  kind: BackupKind
  size: number
  createdAt: string
}

interface BackupListResponse {
  backups: BackupFile[]
  policy: {
    automaticRetention: number
    schedule: string
    timezone: string
    includes: string[]
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error ?? '读取备份失败')
  return payload as BackupListResponse
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

const KIND_META: Record<BackupKind, { label: string; tone: 'accent' | 'success' | 'warning' }> = {
  automatic: { label: '每日自动', tone: 'success' },
  manual: { label: '手动创建', tone: 'accent' },
  safety: { label: '恢复前安全备份', tone: 'warning' },
}

export default function DashboardBackupsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/backups', fetcher)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null
  )

  async function createBackup() {
    setCreating(true)
    setNotice(null)
    try {
      const response = await fetch('/api/backups', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? '创建备份失败')
      await mutate()
      setNotice({ tone: 'success', text: '全站备份已生成，可以从列表中下载。' })
    } catch (createError) {
      setNotice({
        tone: 'danger',
        text: createError instanceof Error ? createError.message : '创建备份失败',
      })
    } finally {
      setCreating(false)
    }
  }

  function chooseImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    setSelectedFile(file)
    setConfirmation('')
    setNotice(null)
  }

  function closeImportDialog() {
    if (importing) return
    setSelectedFile(null)
    setConfirmation('')
  }

  async function importBackup() {
    if (!selectedFile || confirmation !== '恢复') return
    setImporting(true)
    setNotice(null)
    try {
      const response = await fetch('/api/backups/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/gzip',
          'X-Backup-Filename': encodeURIComponent(selectedFile.name),
        },
        body: selectedFile,
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? '恢复备份失败')
      setSelectedFile(null)
      setConfirmation('')
      await mutate()
      setNotice({
        tone: 'success',
        text: '全站数据恢复完成，数据库和媒体文件均已更新，并保留了一份恢复前安全备份。',
      })
    } catch (importError) {
      setNotice({
        tone: 'danger',
        text: importError instanceof Error ? importError.message : '恢复备份失败',
      })
    } finally {
      setImporting(false)
    }
  }

  const automaticCount = data?.backups.filter((item) => item.kind === 'automatic').length ?? 0
  const totalBytes = data?.backups.reduce((sum, item) => sum + item.size, 0) ?? 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="全站备份"
        description="备份数据库、文章、瞬间、站点设置以及所有上传的图片和视频。"
        meta={
          <>
            <AdminStatusBadge tone="success">自动备份 {automaticCount}/3</AdminStatusBadge>
            <AdminStatusBadge>{formatBytes(totalBytes)}</AdminStatusBadge>
          </>
        }
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,.tgz,application/gzip"
              className="hidden"
              onChange={chooseImportFile}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <MaterialSymbol icon="upload_file" size={17} />
              导入备份
            </Button>
            <Button loading={creating} onClick={() => void createBackup()}>
              <MaterialSymbol icon="backup" size={17} />
              立即备份
            </Button>
          </>
        }
      />

      {notice ? <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice> : null}
      {error ? <AdminNotice tone="danger">{error.message}</AdminNotice> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: 'schedule',
            title: '每天自动执行',
            text: `计划 ${data?.policy.schedule ?? '30 3 * * *'} · ${data?.policy.timezone ?? 'Asia/Shanghai'}`,
          },
          {
            icon: 'inventory_2',
            title: '滚动保留三份',
            text: '新的自动备份完成后，最旧的一份会被自动清理。',
          },
          {
            icon: 'verified_user',
            title: '恢复前再备份',
            text: '每次导入前先保存当前全站状态，避免误操作无法回退。',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MaterialSymbol icon={item.icon} size={18} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>

      <AdminPanel
        title="备份文件"
        description="压缩包包含数据库快照、备份清单和完整 uploads 媒体目录。"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
            <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            正在读取备份列表
          </div>
        ) : !data?.backups.length ? (
          <AdminEmptyState
            icon="database"
            title="还没有备份"
            description="点击“立即备份”创建第一份完整站点备份。"
          />
        ) : (
          <div className="divide-y divide-border/60">
            {data.backups.map((backup) => {
              const meta = KIND_META[backup.kind]
              return (
                <div
                  key={backup.name}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge tone={meta.tone}>{meta.label}</AdminStatusBadge>
                      <span className="text-xs text-muted-foreground">{formatBytes(backup.size)}</span>
                    </div>
                    <p className="mt-2 truncate font-mono text-xs text-foreground/86">
                      {backup.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(backup.createdAt)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" asChild>
                    <a href={`/api/backups/${encodeURIComponent(backup.name)}`} download>
                      <MaterialSymbol icon="download" size={15} />
                      下载
                    </a>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </AdminPanel>

      <AdminDialog
        open={Boolean(selectedFile)}
        onClose={closeImportDialog}
        title="恢复全站备份"
        description="这会覆盖当前数据库和上传媒体。"
        size="md"
        footer={
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={closeImportDialog} disabled={importing}>
              取消
            </Button>
            <Button
              variant="danger"
              loading={importing}
              disabled={confirmation !== '恢复'}
              onClick={() => void importBackup()}
            >
              确认恢复
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminNotice tone="warning">
            导入会替换当前文章、瞬间、项目、设置、评论和全部上传媒体。系统会先自动生成一份“恢复前安全备份”。
          </AdminNotice>
          <div className="rounded-xl border border-border/70 bg-background/45 p-4">
            <p className="truncate text-sm font-medium text-foreground">{selectedFile?.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedFile ? formatBytes(selectedFile.size) : ''}
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-xs text-muted-foreground">
              输入“恢复”以确认此操作
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={ADMIN_INPUT_CLASS}
              placeholder="恢复"
              autoComplete="off"
            />
          </label>
        </div>
      </AdminDialog>
    </div>
  )
}

