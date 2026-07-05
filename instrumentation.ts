export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.SITE_BACKUP_ENABLED === 'true'
  ) {
    const { startScheduler } = await import('@/lib/cron/scheduler')
    startScheduler()
  }
}
