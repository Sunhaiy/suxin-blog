/**
 * app/not-found.tsx
 *
 * 全局 404 页面。
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: '404 — 页面不存在',
}

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* 大字数字 */}
      <p className="text-[8rem] font-bold leading-none text-white/5 select-none">404</p>

      <div className="-mt-8 space-y-3">
        <h1 className="text-2xl font-bold text-foreground">页面不存在</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          这个页面已飘散在素心的风里，或许它从未存在过。
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Button asChild variant="primary">
          <Link href="/">返回首页</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/posts">查看文章</Link>
        </Button>
      </div>

      {/* 简单装饰 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full
                        bg-ocean/5 blur-[120px]" />
      </div>
    </main>
  )
}
