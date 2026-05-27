/**
 * lib/cron/scheduler.ts
 *
 * 后台定时任务调度器。
 * 使用 node-cron 管理定时作业。
 *
 * 当前任务：
 *   - 小米手环数据同步（预留，TODO: 接入真实 API）
 *
 * 未来拓展：
 *   - 使用 child_process.execFile() 调用 Python 脚本或 C++ 二进制
 *   - 定时清理孤立上传文件
 *   - sitemap 自动刷新
 *
 * 注意：在 Next.js API Routes 中，该模块需在
 * next.config.mjs 的 serverExternalPackages 中排除。
 * 建议通过独立的 Node.js 入口（如 scripts/start-cron.ts）启动，
 * 与 Next.js 进程并行运行。
 */

import cron from 'node-cron'
import { syncMiBandData } from './jobs/miBandSync'

let initialized = false

export function startScheduler() {
  if (initialized) return
  initialized = true

  console.log('[Cron] Scheduler started.')

  // 小米手环数据同步
  // 默认每小时同步一次（可通过 MI_BAND_SYNC_CRON 环境变量覆盖）
  const miBandCron = process.env.MI_BAND_SYNC_CRON ?? '0 * * * *'
  if (cron.validate(miBandCron)) {
    cron.schedule(miBandCron, async () => {
      console.log('[Cron] Running MiBand sync...')
      try {
        await syncMiBandData()
      } catch (err) {
        console.error('[Cron] MiBand sync failed:', err)
      }
    })
    console.log(`[Cron] MiBand sync scheduled: ${miBandCron}`)
  }
}
