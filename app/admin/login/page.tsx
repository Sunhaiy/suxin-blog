'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('邮箱或密码错误，请重试。')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="admin-theme min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-border/70 bg-card/76 backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-border/70 px-8 py-10 lg:border-b-0 lg:border-r lg:px-10 lg:py-12">
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
              Admin Console
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-foreground">素心后台</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              统一管理文章、瞬间、评论、设置和作品资料。配色、边框和材质和前台保持同源，但整套交互更克制、更像工作台。
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <InfoCard title="写作与发布" description="文章编辑器、推荐位、SEO 和封面信息被放进同一条发布链路里。" />
              <InfoCard title="内容管理" description="列表页统一搜索、筛选、状态语义和危险操作反馈。" />
              <InfoCard title="后台壳层" description="左侧导航固定，右侧内容独立滚动，长页不再拖着整个控制台跑。" />
              <InfoCard title="同源配色" description="主强调色、边框和玻璃材质跟前台站到同一条线上。" />
            </div>
          </div>

          <div className="px-8 py-10 lg:px-10 lg:py-12">
            <div className="max-w-md">
              <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
                Sign In
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">登录后台</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                使用管理员凭据进入控制台。登录态只用于后台工作区，不会影响前台浏览。
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5 rounded-[28px] border border-border/70 bg-background/36 p-6"
            >
              {error ? (
                <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground" htmlFor="email">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-[18px] border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/28 focus:ring-2 focus:ring-primary/14"
                  placeholder="admin@haiy.space"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground" htmlFor="password">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-[18px] border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/28 focus:ring-2 focus:ring-primary/14"
                  placeholder="输入管理员密码"
                />
              </div>

              <Button type="submit" fullWidth loading={loading}>
                登录后台
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/36 px-4 py-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
