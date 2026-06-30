import { PageTransition } from '@/components/ui/PageTransition'

export default function BlogTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
