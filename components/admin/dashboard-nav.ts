export type DashboardNavItem = {
  href: string
  label: string
  icon: string
  description: string
}

export type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: '总览',
    items: [
      {
        href: '/dashboard',
        label: '控制台',
        icon: 'dashboard',
        description: '概览与快捷入口',
      },
    ],
  },
  {
    label: '内容',
    items: [
      {
        href: '/dashboard/posts',
        label: '文章',
        icon: 'article',
        description: '文章与发布',
      },
      {
        href: '/dashboard/moments',
        label: '瞬间',
        icon: 'dynamic_feed',
        description: '动态与记录',
      },
      {
        href: '/dashboard/comments',
        label: '评论',
        icon: 'forum',
        description: '审核与反馈',
      },
      {
        href: '/dashboard/categories',
        label: '分类',
        icon: 'grid_view',
        description: '分类结构',
      },
      {
        href: '/dashboard/tags',
        label: '标签',
        icon: 'sell',
        description: '标签维护',
      },
      {
        href: '/dashboard/links',
        label: '友链',
        icon: 'link',
        description: '合作与链接',
      },
    ],
  },
  {
    label: '作品与资源',
    items: [
      {
        href: '/dashboard/works',
        label: '作品',
        icon: 'deployed_code',
        description: '项目与作品',
      },
      {
        href: '/dashboard/acg',
        label: 'ACG',
        icon: 'stadia_controller',
        description: '动漫与游戏',
      },
      {
        href: '/dashboard/gallery',
        label: '相册',
        icon: 'photo_library',
        description: '图库与资源',
      },
    ],
  },
  {
    label: '系统',
    items: [
      {
        href: '/dashboard/about',
        label: '关于',
        icon: 'person',
        description: '关于页配置',
      },
      {
        href: '/dashboard/settings',
        label: '站点设置',
        icon: 'wallpaper',
        description: '站点与场景',
      },
      {
        href: '/dashboard/ai-writer',
        label: 'AI 写文',
        icon: 'auto_awesome',
        description: 'DeepSeek 自动写文',
      },
      {
        href: '/dashboard/account',
        label: '账号安全',
        icon: 'shield_lock',
        description: '修改管理员邮箱与密码',
      },
      {
        href: '/dashboard/backups',
        label: '全站备份',
        icon: 'database',
        description: '导入、导出与自动备份',
      },
    ],
  },
]

export const DASHBOARD_EDITOR_ITEM: DashboardNavItem = {
  href: '/dashboard/editor',
  label: '新建文章',
  icon: 'edit_square',
  description: '直接进入编辑器',
}

export const DASHBOARD_ITEM_MAP = [
  ...DASHBOARD_NAV_GROUPS.flatMap((group) => group.items),
  DASHBOARD_EDITOR_ITEM,
]
