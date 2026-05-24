/**
 * lib/db/seed.ts
 *
 * 测试数据种子脚本。
 * 执行: npm run db:seed
 *
 * ⚠️  会先清空所有业务表再插入，仅供开发环境使用。
 */

import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const match = t.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Tiptap JSON 内容构建辅助
// ──────────────────────────────────────────────────────────────

function h2(text: string) {
  return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] }
}
function h3(text: string) {
  return { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text }] }
}
function para(...texts: (string | { type: string; text: string; marks?: { type: string }[] })[]) {
  return {
    type: 'paragraph',
    content: texts.map((t) =>
      typeof t === 'string' ? { type: 'text', text: t } : t
    ),
  }
}
function bold(text: string) {
  return { type: 'text', text, marks: [{ type: 'bold' }] }
}
function code(text: string) {
  return { type: 'text', text, marks: [{ type: 'code' }] }
}
function codeBlock(lang: string, text: string) {
  return { type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text }] }
}
function blockquote(text: string) {
  return { type: 'blockquote', content: [para(text)] }
}
function doc(...nodes: object[]) {
  return JSON.stringify({ type: 'doc', content: nodes })
}

// ──────────────────────────────────────────────────────────────
// 内容数据
// ──────────────────────────────────────────────────────────────

const POST_CONTENT_1 = doc(
  h2('为什么选择 ESP32-C3'),
  para(
    'ESP32-C3 是乐鑫推出的一款基于 ',
    bold('RISC-V 单核 32-bit'),
    ' 架构的低功耗 SoC。相比经典的 ESP8266，它拥有更完善的蓝牙 5.0 支持、更大的 RAM，以及内置的硬件安全加速器——而价格依然亲民。'
  ),
  h3('开发环境搭建'),
  para('使用 ESP-IDF v5.x 工具链，以下命令完成基础安装：'),
  codeBlock(
    'bash',
    `git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf && ./install.sh esp32c3 && source ./export.sh
idf.py --version  # 期望输出: ESP-IDF v5.x.x`
  ),
  h3('MQTT 连接核心代码'),
  codeBlock(
    'c',
    `static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                               int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    switch (event->event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "MQTT 已连接");
            esp_mqtt_client_subscribe(client, "/lihuahai/sensor", 0);
            break;
        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "收到数据: topic=%.*s, data=%.*s",
                event->topic_len, event->topic,
                event->data_len, event->data);
            break;
        default: break;
    }
}`
  ),
  blockquote('ESP32-C3 的 GPIO9 在上电时用于下载模式选择，请避免连接外部下拉电阻。'),
  h2('低功耗睡眠策略'),
  para(
    '在低频采集场景（如每 5 分钟上报一次），将 ESP32-C3 配置为 ',
    bold('Deep Sleep'),
    ' 模式，唤醒后重连 Wi-Fi 与 MQTT Broker，平均电流可压到 15μA 以内。'
  ),
  codeBlock(
    'c',
    `// 配置 10 分钟 Deep Sleep
esp_sleep_enable_timer_wakeup(10 * 60 * 1000000ULL);
esp_deep_sleep_start();`
  )
)

const POST_CONTENT_2 = doc(
  h2('技术栈选型'),
  para(
    '本博客采用 ',
    bold('Next.js 15 App Router'),
    ' + TypeScript + PostgreSQL 原生驱动构建，服务端渲染与静态生成混合使用，不依赖任何 ORM。'
  ),
  h3('数据层设计'),
  para('所有 SQL 集中在 ', code('lib/db/dao/'), ' 层，调用方不直接接触 SQL：'),
  codeBlock(
    'typescript',
    `// lib/db/dao/postDao.ts
export async function findPostBySlug(slug: string): Promise<PostRow | null> {
  const result = await query<PostRow>(
    'SELECT * FROM posts WHERE slug = $1',
    [slug]
  )
  return result.rows[0] ?? null
}`
  ),
  h3('认证方案'),
  para('采用 NextAuth v5（Auth.js）的 Credentials Provider，单管理员模式，无需数据库存储 session。'),
  h2('部署与性能'),
  para('静态页面通过 ', code('revalidate = 60'), ' 实现 ISR，API 路由部署在同一 Node.js 进程中，避免冷启动开销。'),
  blockquote('选择 App Router 的最大收益是 Server Components — 从数据库直接渲染 HTML，无需客户端 fetch。')
)

const POST_CONTENT_3 = doc(
  h2('为什么选择 Arch Linux'),
  para(
    'Arch Linux 奉行 ',
    bold('KISS 原则'),
    '（Keep It Simple, Stupid），只安装你真正需要的包，让你完全掌控每一个系统组件。这种哲学与我的工程理念高度契合。'
  ),
  h3('基础配置'),
  codeBlock(
    'bash',
    `# 更新系统
pacman -Syu

# 安装基础开发工具
pacman -S base-devel git neovim tmux

# 配置 AUR 助手 (paru)
git clone https://aur.archlinux.org/paru.git
cd paru && makepkg -si`
  ),
  h3('桌面环境选择'),
  para('我选择了 ', bold('Hyprland'), ' 作为 Wayland 合成器，配合 Waybar 状态栏，启动速度极快，动画流畅。'),
  codeBlock(
    'bash',
    `paru -S hyprland waybar wofi kitty swww
# 拷贝配置文件
cp -r dotfiles/.config/* ~/.config/`
  ),
  h2('日常工作流'),
  para('编辑器：Neovim（LazyVim 发行版）；终端：Kitty；浏览器：Firefox Developer Edition。所有配置文件统一管理在 dotfiles 仓库中。'),
  blockquote('滚动更新发行版对于跟上最新内核和驱动至关重要，但也要做好偶尔需要修复的心理准备。')
)

const POST_CONTENT_4 = doc(
  h2('出发前的忐忑'),
  para(
    '背上 28L 的背包，订了一张去', bold('敦煌'), '的高铁票，独自出发。这是我第一次完全按自己节奏安排的旅行——没有攻略，只有一张粗略的行程图。'
  ),
  h3('莫高窟的震撼'),
  para(
    '壁画并不像照片里那么鲜艳——一千年的风沙已经消去了大半色彩，但正是这种历史的沉淀让它显得如此真实。站在第 96 窟前，我沉默了很久。'
  ),
  h2('鸣沙山日落'),
  para('骑着骆驼走进沙漠时已经接近傍晚，沙丘背面的阴影一点一点覆盖上来，太阳以肉眼可见的速度坠落。此刻没有任何 AI 生成的图片能够替代这种体验。'),
  blockquote('旅行的意义不在于到达某个地方，而在于你在路上成为了什么样的人。')
)

const POST_CONTENT_5 = doc(
  h2('关于认知偏误'),
  para(
    '《清醒思考的艺术》（Die Kunst des klaren Denkens）收录了 52 种常见的思维错误，作者罗尔夫·多贝里以简洁的案例拆解每一种偏误。'
  ),
  h3('最值得铭记的三条'),
  para(bold('1. 幸存者偏差'), '——我们看到的成功案例只是幸存下来的样本，失败的沉没于沉默之中。'),
  para(bold('2. 禀赋效应'), '——一旦拥有某物，我们会高估它的价值，即使它本来平淡无奇。'),
  para(bold('3. 社会认同'), '——当不确定时，我们倾向于跟随大多数人，这在金融市场中尤为危险。'),
  h2('读后感'),
  para('每章只有两三页，适合碎片时间阅读。不过书中的解药往往留白，更多的是让你意识到问题的存在——解法需要靠自己实践摸索。'),
  blockquote('意识不到偏误，才是最大的偏误。')
)

const POST_CONTENT_6 = doc(
  h2('所有权：Rust 最核心的概念'),
  para(
    'Rust 没有垃圾回收器，也不需要手动 ',
    code('malloc/free'),
    '——它靠 ',
    bold('所有权系统'),
    ' 在编译期保证内存安全。核心规则只有三条：每个值有且只有一个所有者；所有者离开作用域时值被释放；值可以被借用（引用），但借用规则严格。'
  ),
  h3('移动语义 vs 克隆'),
  codeBlock(
    'rust',
    `let s1 = String::from("hello");
let s2 = s1; // s1 的所有权移动给 s2，s1 失效

// println!("{}", s1); // ❌ 编译错误：s1 已被移出
println!("{}", s2);   // ✅

let s3 = s2.clone();  // 深拷贝，s2 和 s3 都有效
println!("{} {}", s2, s3);`
  ),
  h3('借用与生命周期'),
  para('不可变引用可以同时存在多个，但可变引用同一时刻只能有一个。编译器通过生命周期标注确保引用永远不会悬空。'),
  codeBlock(
    'rust',
    `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
// 'a 声明两个参数的生命周期至少和返回值一样长`
  ),
  h2('为什么值得学 Rust'),
  para(
    '在嵌入式场景，Rust 可以替代 C 同时获得内存安全；在服务端，',
    bold('Tokio 异步运行时'),
    ' 的性能媲美 Go。更重要的是：学会 Rust，你会从根本上理解内存管理，这对其他语言的编写也大有裨益。'
  ),
  blockquote('Rust 的学习曲线很陡，但爬上去之后视野完全不同了。')
)

const POST_CONTENT_7 = doc(
  h2('为什么要用反向代理'),
  para(
    '将 Next.js / Node.js 应用暴露在 Nginx 后面，可以统一处理 HTTPS 证书、静态文件缓存、限流和负载均衡。本文记录一套用 ',
    bold('Docker Compose + Nginx + Certbot'),
    ' 自动续签 HTTPS 的完整方案。'
  ),
  h3('docker-compose.yml 结构'),
  codeBlock(
    'yaml',
    `services:
  app:
    image: node:20-alpine
    working_dir: /app
    volumes: [./:/app]
    command: node server.js
    expose: ["3000"]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./certbot/www:/var/www/certbot
      - ./certbot/conf:/etc/letsencrypt
    depends_on: [app]

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/www:/var/www/certbot
      - ./certbot/conf:/etc/letsencrypt`
  ),
  h3('Nginx 配置片段'),
  codeBlock(
    'nginx',
    `server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}`
  ),
  h3('自动续签'),
  codeBlock(
    'bash',
    `# 添加到 crontab，每天检查一次
0 3 * * * docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload`
  ),
  blockquote('证书续签失败是生产事故的常见来源，务必配置邮件告警。')
)

const POST_CONTENT_8 = doc(
  h2('EXPLAIN ANALYZE 基础'),
  para(
    '慢查询优化的第一步是读懂执行计划。',
    code('EXPLAIN ANALYZE'),
    ' 会实际执行查询并返回每个节点的预估成本与真实耗时，两者差距越大往往意味着统计信息过时。'
  ),
  codeBlock(
    'sql',
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT p.title, COUNT(c.id) AS comment_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
WHERE p.status = 'published'
GROUP BY p.id
ORDER BY comment_count DESC
LIMIT 20;`
  ),
  h3('常见性能杀手'),
  para(bold('Seq Scan on 大表'), '——通常意味着缺少索引或查询条件无法命中现有索引。'),
  para(bold('Hash Join vs Nested Loop'), '——小结果集用 Nested Loop；大表 join 大表时 Hash Join 更优，可以用 ', code('SET enable_nestloop=off'), ' 强制测试。'),
  para(bold('Rows=1000 vs actual rows=500000'), '——统计信息失真，执行 ', code('ANALYZE table_name'), ' 刷新。'),
  h3('部分索引与覆盖索引'),
  codeBlock(
    'sql',
    `-- 部分索引：只索引已发布的文章，减少索引大小
CREATE INDEX idx_posts_pub ON posts (published_at DESC)
  WHERE status = 'published';

-- 覆盖索引：查询只需要 title 和 slug，不回表
CREATE INDEX idx_posts_cover ON posts (status, published_at DESC)
  INCLUDE (title, slug);`
  ),
  blockquote('不要盲目加索引——每个索引都会拖慢写入速度，权衡之后再动手。')
)

const POST_CONTENT_9 = doc(
  h2('条件类型入门'),
  para(
    'TypeScript 的条件类型形如 ',
    code('T extends U ? X : Y'),
    '——如果 T 可分配给 U，则结果为 X，否则为 Y。配合 ',
    bold('infer'),
    ' 关键字，可以从类型结构中"提取"出子类型，实现强大的类型推导。'
  ),
  codeBlock(
    'typescript',
    `// 提取函数返回值类型（标准库 ReturnType 的简化实现）
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = (x: number) => string
type R = MyReturnType<Fn>  // string`
  ),
  h3('分布式条件类型'),
  para('当 T 为联合类型时，条件类型会自动分发到每个成员上：'),
  codeBlock(
    'typescript',
    `type ToArray<T> = T extends any ? T[] : never
type StrOrNumArr = ToArray<string | number>
// => string[] | number[]

// 如果不想分发，用元组包裹：
type NoDistrib<T> = [T] extends [any] ? T[] : never
type All = NoDistrib<string | number>
// => (string | number)[]`
  ),
  h3('实战：DeepReadonly'),
  codeBlock(
    'typescript',
    `type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K]
}`
  ),
  blockquote('类型体操的本质是在类型层面做"编程"，理解了 infer，TypeScript 的天花板高了一倍。')
)

const POST_CONTENT_10 = doc(
  h2('凌晨两点的上海'),
  para(
    '城市在白天属于所有人，但深夜只属于少数漫游者。我习惯在写代码写到瓶颈时出门走走，带上耳机，让脚步带着思路自由漂移。'
  ),
  h3('武康路到安福路'),
  para(
    '梧桐树把路灯切成碎片，影子在石板路上摇晃。路过一家还开着灯的书店，老板坐在里面看书，也不知道是在等顾客还是只是需要一盏灯的陪伴。'
  ),
  h3('苏州河边'),
  para('河风带着一点潮气，水面反射着对岸的霓虹，断断续续。我在一个废弃的集装箱码头坐了很久，脑子里突然想通了白天卡了三个小时的 bug——是状态更新时序问题。'),
  h2('为什么要夜走'),
  para('不是因为喜欢孤独，而是大脑在安静的环境里才能真正整理白天接收的信息。有些想法必须走出来，坐在屏幕前是等不到的。'),
  blockquote('最好的 debug 工具有时候不是 console.log，而是一双鞋。')
)

const POST_CONTENT_11 = doc(
  h2('写代码需要正确的背景音'),
  para(
    '我不是那种能在完全安静中工作的人，也承受不了歌词干扰思路。下面是 2025 年陪我敲了最多行代码的歌单，按场景分类。'
  ),
  h3('深度专注 — 纯器乐'),
  para(bold('Ólafur Arnalds'), ' — 冰岛钢琴 + 弦乐，情绪干净，适合写需要高度集中的算法。'),
  para(bold('Brian Eno'), ' — Ambient 系列，几乎没有旋律起伏，像空气一样存在。'),
  para(bold('Nils Frahm'), ' — "All Melody" 专辑，钢琴与电子的边界模糊，循环听不腻。'),
  h3('攻坚 Debug — 节奏感强'),
  para(bold('Daft Punk'), ' — "Random Access Memories"，机械感与人情味并存，适合啃难题。'),
  para(bold('Jon Hopkins'), ' — "Immunity"，开头安静、中段炸裂，节奏踩点很适合 refactor 时的节奏感。'),
  h3('收尾 Review — 轻松'),
  para(bold('Mac DeMarco'), ' — 慵懒吉他，适合代码写完在做 Code Review 的时候听。'),
  para(bold('Khruangbin'), ' — 全球融合风，完全不喧宾夺主。'),
  blockquote('找到属于自己的"编程态"音乐，效率能提升不止一倍。')
)

const POST_CONTENT_12 = doc(
  h2('从认知革命讲起'),
  para(
    '赫拉利把人类史压缩为三场革命：约 7 万年前的 ',
    bold('认知革命'),
    '、约 1.2 万年前的 ',
    bold('农业革命'),
    '、约 500 年前的 ',
    bold('科学革命'),
    '。其中认知革命最让我着迷——智人开始能够相信"虚构的故事"，从而前所未有地大规模协作。'
  ),
  h3('虚构的力量'),
  para('国家、货币、公司、法律——这些全是"虚构"，只存在于人类共同的想象中。狮子无法对你说"我承认美元的价值"，但全球 80 亿人可以。正是这种集体虚构让智人称霸地球。'),
  h3('农业革命：人类最大的骗局？'),
  para(
    '赫拉利的颠覆性论点：农业革命对大多数个体来说是',
    bold('生活质量下降'),
    '。狩猎采集者每天劳动 3-4 小时，食物多样；农民却被土地绑死，饱受饥荒、疾病和剥削。受益的是基因复制——小麦、大米成了地球上最成功的植物。'
  ),
  h2('读后的一些困惑'),
  para('书的前半部精彩，但到"幸福"那章开始变得模糊。历史分析是赫拉利的强项，当他转向主观感受时论证密度明显下降。'),
  blockquote('这本书最大的价值不是给出答案，而是让你开始质疑那些从未质疑过的"理所当然"。')
)

const POST_CONTENT_13 = doc(
  h2('为什么是树莓派'),
  para(
    '家里有几块闲置的硬盘，想组一个低功耗的 NAS 供内网访问。NUC 太贵，群晖有溢价——树莓派 5 的 ',
    bold('USB 3.0'),
    ' 带宽已经足够跑 SMB 共享，功耗仅 5-15W，非常适合 24 小时在线。'
  ),
  h3('硬件清单'),
  para('树莓派 5（8GB 版）、官方主动散热套件、2.5" 硬盘 + USB 3.0 硬盘盒 × 2、64GB SD 卡（系统盘）。'),
  h3('系统与 Samba 配置'),
  codeBlock(
    'bash',
    `# 安装 Samba
sudo apt update && sudo apt install samba -y

# 创建共享目录
sudo mkdir -p /mnt/nas/media /mnt/nas/backup
sudo chown -R pi:pi /mnt/nas`
  ),
  codeBlock(
    'bash',
    `# /etc/samba/smb.conf 追加
[NAS-Media]
  path = /mnt/nas/media
  read only = no
  browsable = yes
  valid users = pi

[NAS-Backup]
  path = /mnt/nas/backup
  read only = no
  browsable = yes
  valid users = pi`
  ),
  codeBlock(
    'bash',
    `# 设置 Samba 用户密码
sudo smbpasswd -a pi
sudo systemctl restart smbd`
  ),
  h3('写速度测试'),
  para('通过千兆网，SMB 写入速度稳定在 115 MB/s，对于家用场景完全够用。'),
  blockquote('比买群晖省了 3000 块，顺便学了一遍 Linux 存储管理。')
)

const POST_CONTENT_14 = doc(
  h2('rebase 是什么，什么时候用'),
  para(
    bold('git rebase'),
    ' 将一系列提交"重新播放"到另一个基点上，历史线性清晰；而 ',
    bold('git merge'),
    ' 保留分支历史但引入 merge commit。团队协作时，特性分支在 PR 前通常 rebase 到 main，保持主干整洁。'
  ),
  codeBlock(
    'bash',
    `# 在 feature 分支上，把 main 的最新改动纳入
git fetch origin
git rebase origin/main

# 解决冲突后继续
git add .
git rebase --continue`
  ),
  h3('cherry-pick 精准摘取'),
  para('当你只需要某个分支的某几个提交，而不是全部合并时，', code('cherry-pick'), ' 是最优雅的方案：'),
  codeBlock(
    'bash',
    `# 把 abc1234 这个提交应用到当前分支
git cherry-pick abc1234

# 摘取多个连续提交
git cherry-pick abc1234^..def5678`
  ),
  h3('stash 的进阶用法'),
  codeBlock(
    'bash',
    `# 给 stash 起名字（比默认的 WIP 好找得多）
git stash push -m "fix: cookie 序列化临时方案"

# 查看所有 stash
git stash list

# 恢复指定 stash 且保留在列表中
git stash apply stash@{2}`
  ),
  blockquote('Git 是开发者最重要的时间机器，花时间学好值得。')
)

const POST_CONTENT_15 = doc(
  h2('为什么要 DIY 键盘'),
  para(
    '用了三年的薄膜键盘终于寿终正寝，趁机入坑机械键盘。选择 DIY 而非成品，是因为想要完全自定义轴体手感、配列和重量——没有"完美的成品键盘"，只有"刚好适合你"的键盘。'
  ),
  h3('配列选择：65%'),
  para('65% 配列（67 键）保留了方向键和右侧少量功能键，在紧凑和实用之间取得平衡。适合主力是代码编写、偶尔需要方向键导航的场景。'),
  h3('轴体：凯华 Box 玫瑰红 v2'),
  para('段落感适中，回弹利落，长时间码字不疲惫。比原厂青轴安静很多，不影响外人。入手后先做了润轴：'),
  codeBlock(
    'text',
    `润滑剂：Krytox 205g0
上轴工具：轴体开关器 + 小画笔
润轴数量：67 个，约耗时 4 小时

润发弹簧：Krytox GPL 105（油浴法，快很多）`
  ),
  h3('PCB 开焊与固件'),
  para('使用 VIA 配置固件，支持实时改键无需刷写。把 Caps Lock 映射为 Ctrl，Fn + HJKL 映射为方向键，效率提升明显。'),
  h2('成本与感受'),
  para('PCB + 外壳 520 元，轴体 67 个约 80 元，键帽 200 元，合计约 800 元。成品同等手感可能要 1500+。'),
  blockquote('第一次敲下润轴后的键盘时，那种"砰"感让我理解了为什么有人会收藏几十把键盘。')
)

// ──────────────────────────────────────────────────────────────
// 主函数
// ──────────────────────────────────────────────────────────────

async function seed() {
  loadEnv(path.join(process.cwd(), '.env.local'))

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  const client = await pool.connect()

  console.log('[seed] 连接到数据库...')

  try {
    await client.query('BEGIN')

    // ── 1. 清空（逆 FK 顺序）────────────────────────────────
    console.log('[seed] 清空现有数据...')
    await client.query(`
      TRUNCATE TABLE
        comments, gallery_items, gallery_albums, links, settings,
        animes, games, moments, posts, works
      RESTART IDENTITY CASCADE
    `)

    // ── 2. 文章 ──────────────────────────────────────────────
    console.log('[seed] 插入文章...')
    const postsResult = await client.query(`
      INSERT INTO posts
        (title, slug, content, excerpt, status, tags, category, view_count, published_at)
      VALUES
        ($1,$2,$3,$4,'published','{ESP32,物联网,MQTT,C语言,嵌入式}','技术笔记',342,NOW() - INTERVAL '45 days'),
        ($5,$6,$7,$8,'published','{Next.js,TypeScript,PostgreSQL,全栈,博客}','项目实战',218,NOW() - INTERVAL '38 days'),
        ($9,$10,$11,$12,'published','{Arch Linux,Linux,Hyprland,Wayland,开源}','技术笔记',156,NOW() - INTERVAL '30 days'),
        ($13,$14,$15,$16,'published','{旅行,敦煌,莫高窟,生活,攻略}','生活随笔',89,NOW() - INTERVAL '22 days'),
        ($17,$18,$19,$20,'draft','{读书,认知,思维,随笔}','读书笔记',0,NULL),
        ($21,$22,$23,$24,'published','{Rust,所有权,内存安全,系统编程}','技术笔记',175,NOW() - INTERVAL '18 days'),
        ($25,$26,$27,$28,'published','{Docker,Nginx,HTTPS,运维,部署}','技术笔记',203,NOW() - INTERVAL '14 days'),
        ($29,$30,$31,$32,'published','{PostgreSQL,数据库,性能优化,SQL}','技术笔记',131,NOW() - INTERVAL '11 days'),
        ($33,$34,$35,$36,'published','{TypeScript,类型系统,泛型,前端}','技术笔记',98,NOW() - INTERVAL '8 days'),
        ($37,$38,$39,$40,'published','{生活,上海,夜晚,随想}','生活随笔',64,NOW() - INTERVAL '6 days'),
        ($41,$42,$43,$44,'published','{音乐,歌单,编程,生活}','生活随笔',112,NOW() - INTERVAL '5 days'),
        ($45,$46,$47,$48,'published','{读书,历史,人文,认知}','读书笔记',87,NOW() - INTERVAL '4 days'),
        ($49,$50,$51,$52,'published','{树莓派,NAS,Linux,DIY,运维}','项目实战',146,NOW() - INTERVAL '3 days'),
        ($53,$54,$55,$56,'published','{Git,版本控制,工作流,开发工具}','技术笔记',193,NOW() - INTERVAL '2 days'),
        ($57,$58,$59,$60,'published','{键盘,DIY,硬件,生活}','生活随笔',78,NOW() - INTERVAL '1 day')
      RETURNING id
    `, [
      'ESP32-C3 开发实战：从零搭建 MQTT 物联网节点', 'esp32c3-mqtt-iot-node',
      POST_CONTENT_1,
      '详细记录使用 ESP32-C3 构建轻量级 MQTT 客户端的全过程，包含环境配置、引脚复用与低功耗睡眠策略。',

      'Next.js 15 全栈博客开发：App Router + PostgreSQL + Tiptap', 'nextjs15-fullstack-blog',
      POST_CONTENT_2,
      '从零开始用 Next.js 15 App Router 构建个人博客的完整记录，不依赖 ORM，原生 pg 驱动直连 PostgreSQL。',

      'Arch Linux 每日驱动配置备忘录 2025', 'arch-linux-daily-driver-2025',
      POST_CONTENT_3,
      '我的 Arch Linux 工作站配置全记录：Hyprland + Waybar + Neovim + Kitty，极简而高效。',

      '人生第一次独自旅行——敦煌七天', 'solo-trip-dunhuang',
      POST_CONTENT_4,
      '带着一个背包和一张高铁票，第一次独自来到敦煌。莫高窟、鸣沙山、戈壁日出……一些东西改变了。',

      '读《清醒思考的艺术》：52 种思维陷阱', 'reading-art-of-clear-thinking',
      POST_CONTENT_5,
      '罗尔夫·多贝里总结的 52 种认知偏误。薄薄一本，每章两三页，但每一章都能击中你日常中某个不自知的时刻。',

      'Rust 所有权模型入门：从移动语义到生命周期', 'rust-ownership-beginner',
      POST_CONTENT_6,
      '以实例拆解 Rust 最核心的三条所有权规则，以及借用、生命周期标注的实际含义。没有 GC，也没有手动内存管理，只有编译期的严格检查。',

      'Docker + Nginx 反向代理 + Certbot 自动续签 HTTPS 完整方案', 'docker-nginx-certbot-https',
      POST_CONTENT_7,
      '用 Docker Compose 一键部署 Nginx 反向代理，配合 Certbot 每天自动检查并续签 Let\'s Encrypt 证书，零成本获得生产级 HTTPS。',

      'PostgreSQL 慢查询优化实战：读懂 EXPLAIN ANALYZE', 'postgresql-explain-analyze-optimization',
      POST_CONTENT_8,
      'EXPLAIN ANALYZE 是 PostgreSQL 最强大的诊断工具。本文从执行计划的节点结构讲起，结合部分索引与覆盖索引实战优化慢查询。',

      'TypeScript 高级类型体操：条件类型与 infer 关键字', 'typescript-conditional-types-infer',
      POST_CONTENT_9,
      '条件类型是 TypeScript 类型系统最强大的特性之一。从 ReturnType 的实现原理到 DeepReadonly，用实例讲清楚 infer 的正确使用姿势。',

      '凌晨两点的上海：徒步是最好的 Debug 工具', 'shanghai-night-walk',
      POST_CONTENT_10,
      '写代码到卡壳，出门走了三个小时。武康路的梧桐、苏州河的夜风，以及在某个废弃码头突然想通的那个 bug。',

      '2025 年编程配乐歌单：按场景分类的 40 首', 'coding-playlist-2025',
      POST_CONTENT_11,
      '深度专注、攻坚 Debug、收尾 Review 三种模式各自需要不同的背景音。分享这一年陪我敲了最多行代码的歌单。',

      '读《人类简史》：那些颠覆我认知的论点', 'reading-sapiens-yuval-harari',
      POST_CONTENT_12,
      '赫拉利用三场革命重新解释了人类历史。最让我久久不能平静的，是农业革命那章——他说那可能是人类史上最大的骗局。',

      '树莓派 5 搭建家用 NAS + Samba 共享：比群晖省了 3000 块', 'raspberry-pi-5-nas-samba',
      POST_CONTENT_13,
      '用树莓派 5 + USB 3.0 硬盘盒搭建低功耗家用 NAS，配置 Samba 内网访问，千兆网写速稳定在 115 MB/s，全程记录。',

      'Git 进阶工作流：rebase、cherry-pick 与 stash 最佳实践', 'git-advanced-workflow',
      POST_CONTENT_14,
      '合并策略、精准摘取提交、临时存储工作区——这三件事用好了，Git 工作流能提升一个量级。',

      'DIY 机械键盘全记录：轴体润滑、PCB 开焊与 VIA 配置', 'diy-mechanical-keyboard-build',
      POST_CONTENT_15,
      '65% 配列 + 凯华 Box 玫瑰红 v2，从选轴、润轴到焊接、固件配置的完整记录。成本约 800 元，体验超越同价位大多数成品。',
    ])
    const postIds = postsResult.rows.map((r: { id: number }) => r.id)

    // ── 3. 评论 ──────────────────────────────────────────────
    console.log('[seed] 插入评论...')
    await client.query(`
      INSERT INTO comments (post_id, author_name, author_email, content, is_approved, created_at)
      VALUES
        ($1,'张三','zhangsan@example.com','写得非常详细！我按照这个教程搭好了，唯一踩坑的是 GPIO9 那里，文章里专门提到了，感谢！',TRUE,NOW() - INTERVAL '12 days'),
        ($1,'嵌入式小白','','请问 ESP32-C3 连接阿里云 IoT 平台的 MQTT 和这篇文章有啥区别吗？',TRUE,NOW() - INTERVAL '10 days'),
        ($1,'李四',NULL,'代码风格很清晰，收藏了',FALSE,NOW() - INTERVAL '2 days'),
        ($2,'前端同学','fe@example.com','Server Components 的部分讲得很清楚，之前我一直搞不懂什么时候该用客户端组件',TRUE,NOW() - INTERVAL '8 days'),
        ($3,'arch_user','','Hyprland 的动画确实很丝滑，但我用 NVIDIA 显卡踩了很多坑，建议加一段 NVIDIA 专属配置',TRUE,NOW() - INTERVAL '4 days'),
        ($4,'旅行者','tourist@qq.com','敦煌太美了，我也去过，莫高窟真的震撼。强烈推荐也去一下西千佛洞，人少景美！',FALSE,NOW() - INTERVAL '1 day')
    `, [postIds[0], postIds[1], postIds[2], postIds[3]])

    // ── 4. 极客瞬间 ──────────────────────────────────────────
    console.log('[seed] 插入瞬间...')
    await client.query(`
      INSERT INTO moments (type, content, meta, mood, weather, location, is_public, created_at)
      VALUES
        ('text','把博客的评论系统终于跑通了，从数据库 Schema 到前端表单一口气写完，满满的成就感。',NULL,'😄','晴','在家',TRUE,NOW() - INTERVAL '2 hours'),
        ('sleep',NULL,'{"sleepStart":"23:15","sleepEnd":"07:30","deepSleepMinutes":92,"lightSleepMinutes":185,"remMinutes":43,"score":84}',NULL,NULL,NULL,TRUE,NOW() - INTERVAL '10 hours'),
        ('steps',NULL,'{"steps":12483,"distance":9120,"calories":487,"activeMinutes":62}','😊','多云','上海',TRUE,NOW() - INTERVAL '1 day'),
        ('text','刷到一篇关于 Zig 语言的文章，内存管理模型很有意思。也许下个项目可以尝试一下，毕竟 C 的 UB 已经让我折腾够了。',NULL,'🤔','阴',NULL,TRUE,NOW() - INTERVAL '2 days'),
        ('mood','最近睡眠质量很受影响，深睡时间明显减少。准备实验一下睡前不刷手机的方案，用实体书代替。',NULL,'😴','多云','在家',TRUE,NOW() - INTERVAL '3 days'),
        ('steps',NULL,'{"steps":6820,"distance":4950,"calories":231,"activeMinutes":28}',NULL,'小雨','上海',TRUE,NOW() - INTERVAL '4 days'),
        ('sleep',NULL,'{"sleepStart":"00:42","sleepEnd":"08:05","deepSleepMinutes":61,"lightSleepMinutes":221,"remMinutes":57,"score":72}',NULL,NULL,NULL,TRUE,NOW() - INTERVAL '5 days'),
        ('text','Tailwind CSS v4 的 CSS 变量原生支持太香了，以前要写一堆 JIT arbitrary value，现在直接用 CSS 变量搞定双主题，代码量减少了 30%。',NULL,'😍','晴','在家',TRUE,NOW() - INTERVAL '6 days'),
        ('link','分享一个好用的正则可视化工具 regex101.com，调试复杂正则必备',NULL,NULL,NULL,NULL,TRUE,NOW() - INTERVAL '8 days'),
        ('text','今天把 Neovim 配置从 init.lua 迁移到 LazyVim，快捷键几乎不用改，但插件管理清爽多了。顺手装了 nvim-tree 和 telescope，幸福感+1。',NULL,'😄','晴',NULL,TRUE,NOW() - INTERVAL '10 days'),
        ('text','读完《清醒思考的艺术》，每章两三页，轻松。其中「幸存者偏差」那章让我重新审视了自己对「成功案例」的崇拜。',NULL,'📚','阴','咖啡馆',TRUE,NOW() - INTERVAL '14 days')
    `)

    // ── 5. 动漫 ──────────────────────────────────────────────
    console.log('[seed] 插入动漫...')
    await client.query(`
      INSERT INTO animes
        (title, title_cn, type, episodes_total, episodes_watched, status, rating, short_review, start_season)
      VALUES
        ('Shingeki no Kyojin: The Final Season','进击的巨人 最终季','tv',16,16,'completed',9.8,'剧情密度极高，世界观的最终揭示令人窒息。结局争议很大，但我认为是神来之笔。','2020冬'),
        ('Kimetsu no Yaiba','鬼灭之刃','tv',26,26,'completed',8.5,'战斗作画顶级，人物情感丰富。遗刃篇和无限列车篇是巅峰。','2019春'),
        ('Ghost in the Shell: SAC_2045','攻壳机动队 SAC_2045','tv',12,7,'watching',7.2,'3D 风格需要适应，但素子的角色塑造依然在线，剧情慢慢打开了。','2020春'),
        ('Houseki no Kuni','宝石之国','tv',12,0,'plan_to_watch',NULL,'据说 CG 动画中少有的杰作，剧情很下头。找个安静的周末一口气看完。','2017秋'),
        ('Vinland Saga Season 2','冰海战记 第二季','tv',24,24,'completed',9.5,'从复仇到救赎，角色成长线极为扎实。比第一季更成熟，更克制，也更有力量。','2023冬'),
        ('Bocchi the Rock!','孤独摇滚！','tv',12,12,'completed',9.0,'治愈系神作。后藤一里的每一次台词都精准踩到了社恐的命门，笑着笑着就哭了。','2022秋')
    `)

    // ── 6. 游戏 ──────────────────────────────────────────────
    console.log('[seed] 插入游戏...')
    await client.query(`
      INSERT INTO games
        (title, platform, status, play_hours, rating, short_review, completed_at)
      VALUES
        ('Elden Ring','pc','platinum',162.5,10.0,'魂系列集大成之作。开放世界与受苦玩法完美融合，每一个 Boss 都是一首战斗诗篇。铂金值得。',NOW() - INTERVAL '200 days'),
        ('Cyberpunk 2077: Phantom Liberty','pc','completed',84.0,9.2,'V 的故事画上了完美句点。夜之城的世界观密度、配乐、演出，让我久久回味。',NOW() - INTERVAL '120 days'),
        ('Hollow Knight','pc','completed',48.3,9.5,'地图设计天才之作，Boss 难度曲线克制而精准。白色宫殿让我崩溃，但通关后的成就感无与伦比。',NOW() - INTERVAL '180 days'),
        ('Nintendo Switch Sports','switch','playing',18.5,7.8,'和朋友打保龄球很欢乐，腕带必须戴好。体感游戏的乐趣是电视游戏无法替代的。',NULL),
        ('Stardew Valley','pc','plan_to_play',NULL,NULL,'已经被无数人安利，据说可以治愈焦虑。找个周末开荒。',NULL),
        ('Balatro','pc','completed',35.0,9.6,'2024 年最上头的 Roguelike，"再来一把"的魔力强到令人发指。组合的涌现感极佳。',NOW() - INTERVAL '30 days')
    `)

    // ── 7. 相册 ──────────────────────────────────────────────
    console.log('[seed] 插入相册...')
    await client.query(`
      INSERT INTO gallery_albums
        (name, slug, description, sort_order)
      VALUES
        ('最近照片', 'latest-capture', 'Latest capture', 1),
        ('旅行归档', 'travel-archive', 'Travel archive', 2),
        ('桌面与设备', 'workspace-archive', 'Workspace archive', 3)
    `)

    await client.query(`
      INSERT INTO gallery_items
        (title, description, url, thumbnail_url, file_name, category, width, height, tags, is_featured, sort_order, album_id)
      VALUES
        ('敦煌莫高窟黄昏','傍晚的阳光斜射在崖壁上，金色与土黄交织，说不出话来',
         '/uploads/gallery/mogao-sunset.jpg','/uploads/gallery/thumb/mogao-sunset.jpg',
         'mogao-sunset.jpg','photo',4032,3024,'{敦煌,旅行,黄昏,历史}',TRUE,1,2),
        ('鸣沙山骆驼队','夕阳下的骆驼剪影，沙漠的极简美学',
         '/uploads/gallery/camel-silhouette.jpg','/uploads/gallery/thumb/camel-silhouette.jpg',
         'camel-silhouette.jpg','photo',3840,2160,'{沙漠,骆驼,剪影,旅行}',TRUE,2,2),
        ('Arch Linux 桌面截图','Hyprland + Waybar，干净清爽的工作环境',
         '/uploads/gallery/arch-desktop.png','/uploads/gallery/thumb/arch-desktop.png',
         'arch-desktop.png','screenshot',2560,1440,'{Linux,Arch,桌面,开源}',FALSE,3,3),
        ('ESP32-C3 开发板布线','MQTT 项目的实际接线，手工焊接功率模块',
         '/uploads/gallery/esp32c3-wiring.jpg','/uploads/gallery/thumb/esp32c3-wiring.jpg',
         'esp32c3-wiring.jpg','photo',2448,3264,'{嵌入式,ESP32,硬件,DIY}',FALSE,4,3),
        ('某个深夜的咖啡馆','一个人，一本书，一杯美式，让城市的喧嚣退后',
         '/uploads/gallery/cafe-night.jpg','/uploads/gallery/thumb/cafe-night.jpg',
         'cafe-night.jpg','photo',4000,3000,'{夜晚,咖啡馆,氛围,生活}',TRUE,5,1)
    `)

    // ── 8. 友情链接 ──────────────────────────────────────────
    console.log('[seed] 插入友链...')
    await client.query(`
      INSERT INTO links (name, url, description, category, sort_order, is_active)
      VALUES
        ('GitHub','https://github.com','全球最大代码托管平台，开源精神的核心据点','resource',1,TRUE),
        ('MDN Web Docs','https://developer.mozilla.org','最权威的 Web 开发参考文档，没有之一','resource',2,TRUE),
        ('Tailwind CSS 官网','https://tailwindcss.com','原子化 CSS 框架，设计效率革命','tool',1,TRUE),
        ('Tiptap 富文本编辑器','https://tiptap.dev','基于 ProseMirror 的无头富文本框架，高度可扩展','tool',2,TRUE),
        ('乐鑫开发者社区','https://www.esp32.com','ESP32 系列芯片官方论坛，技术问题必备','resource',3,TRUE),
        ('Arch Wiki','https://wiki.archlinux.org','Linux 世界最详细的 Wiki，即使不用 Arch 也值得查阅','resource',4,TRUE),
        ('Next.js 官方文档','https://nextjs.org/docs','App Router 全部秘密都在这里','tool',3,TRUE),
        ('一位老友的博客','https://example.com','写代码也写生活，文字很有温度','friend',1,TRUE),
        ('regex101','https://regex101.com','正则表达式调试神器，支持 PCRE/Python/JS 等多种引擎','tool',4,TRUE),
        ('Excalidraw','https://excalidraw.com','手绘风格白板工具，画架构图一流','tool',5,TRUE)
    `)

    // ── 9. 作品 ──────────────────────────────────────────────
    console.log('[seed] 插入作品...')
    await client.query(`
      INSERT INTO works (slug, title, subtitle, description, cover_url, tags, url, github_url, year, sort_order)
      VALUES
        ('lihuahai-stack', 'Lihuahai Stack', 'Personal digital operating system', 'A Next.js 15 full-stack site that combines writing, moments, ACG tracking, gallery modules, and project storytelling in one cohesive platform.', '/hero.png', ARRAY['Next.js 15', 'TypeScript', 'PostgreSQL', 'Tiptap', 'NextAuth'], NULL, 'https://github.com', 2024, 1),
        ('esp32-home-gateway', 'ESP32 Home Gateway', 'MQTT + Home Assistant local bridge', 'A low-power ESP32-C3 gateway that links edge sensors through MQTT and keeps the automation stack local-first and resilient.', '/hero.png', ARRAY['ESP32', 'C/C++', 'MQTT', 'FreeRTOS', 'Home Assistant'], NULL, 'https://github.com', 2024, 2),
        ('arch-linux-dotfiles', 'Arch Linux Dotfiles', 'Automated workstation bootstrap', 'A reproducible Arch Linux setup with Hyprland, Waybar, Neovim, and scripts that make a fresh machine usable fast.', '/hero.png', ARRAY['Bash', 'Lua', 'Hyprland', 'Neovim', 'Arch Linux'], NULL, 'https://github.com', 2023, 3),
        ('bangumi-cli', 'Bangumi CLI', 'Terminal-first watch tracker', 'A Go-based CLI for tracking anime progress with Bangumi sync, SQLite cache, ratings, and shell-friendly workflows.', '/hero.png', ARRAY['Go', 'SQLite', 'Bangumi API', 'CLI', 'zsh'], NULL, 'https://github.com', 2023, 4),
        ('raspberry-pi-media-hub', 'Raspberry Pi Media Hub', 'Home NAS and media services', 'A Raspberry Pi 5 home stack that combines storage, Jellyfin streaming, remote access, and DNS filtering into one manageable setup.', '/hero.png', ARRAY['Raspberry Pi', 'OpenMediaVault', 'Jellyfin', 'Tailscale', 'Docker'], NULL, NULL, 2024, 5)
    `)

    await client.query(`
      UPDATE works
      SET
        slug = CASE sort_order
          WHEN 1 THEN 'lihuahai-stack'
          WHEN 2 THEN 'esp32-home-gateway'
          WHEN 3 THEN 'arch-linux-dotfiles'
          WHEN 4 THEN 'bangumi-cli'
          WHEN 5 THEN 'raspberry-pi-media-hub'
          ELSE slug
        END,
        summary = CASE sort_order
          WHEN 1 THEN 'A personal full-stack hub that combines posts, moments, media, and project storytelling in one consistent UI system.'
          WHEN 2 THEN 'A local-first ESP32-C3 gateway focused on stable device messaging, low power usage, and Home Assistant integration.'
          WHEN 3 THEN 'A reproducible Arch Linux workspace with opinionated automation for shells, editors, and desktop tooling.'
          WHEN 4 THEN 'A terminal-first Bangumi tracker with offline cache, lightweight interaction, and fast episode logging.'
          WHEN 5 THEN 'A private Raspberry Pi media and remote access stack designed for home use and easy long-term maintenance.'
          ELSE summary
        END,
        content = CASE sort_order
          WHEN 1 THEN 'This project started as a small blog and slowly turned into a full personal operating system on the web. The goal is not only to publish writing, but also to host moments, archives, project details, and lightweight media workflows.' || E'\n\n' || 'The current iteration connects typography, weather scenes, background layers, works detail pages, and dashboard controls into one visual system so the content model and the interface finally move together.'
          WHEN 2 THEN 'The gateway is built around ESP32-C3 nodes and a local MQTT network. It is meant to keep device automation dependable even when the public internet is unavailable.' || E'\n\n' || 'On the product side, the detail page highlights node structure, implementation milestones, and contributor roles so the hardware story reads clearly on the web.'
          WHEN 3 THEN 'The aim is not just to sync dotfiles, but to package an entire workstation flow into something repeatable. That includes package setup, shell defaults, editor presets, and desktop polish.' || E'\n\n' || 'The new project model makes it easier to explain versioning, rollout progress, and the practical tradeoffs behind the setup.'
          WHEN 4 THEN 'This tool leans hard into a clean terminal experience. Fast lookup, offline cache, keyboard-first interaction, and low-noise status updates are the main design goals.' || E'\n\n' || 'The new detail page keeps room for links, pricing, and onboarding CTAs while still feeling like a product archive instead of a storefront.'
          WHEN 5 THEN 'This stack is better explained through deployment structure than through a short card description. It combines storage, media streaming, remote access, and network filtering into one maintainable home setup.' || E'\n\n' || 'Because of that, the detail page keeps milestones and contributor metadata visible so the whole rollout can be understood at a glance.'
          ELSE content
        END,
        seal = CASE sort_order
          WHEN 1 THEN 'Flagship'
          WHEN 2 THEN 'Lab'
          WHEN 3 THEN 'Ops'
          WHEN 4 THEN 'CLI'
          WHEN 5 THEN 'Infra'
          ELSE seal
        END,
        status_text = CASE sort_order
          WHEN 1 THEN 'IN_PROGRESS'
          WHEN 2 THEN 'ACTIVE'
          WHEN 3 THEN 'MAINTAINED'
          WHEN 4 THEN 'SHIPPING'
          WHEN 5 THEN 'STABLE'
          ELSE status_text
        END,
        progress_text = CASE sort_order
          WHEN 1 THEN '4 / 6'
          WHEN 2 THEN '3 / 5'
          WHEN 3 THEN '2 / 3'
          WHEN 4 THEN '1 / 2'
          WHEN 5 THEN '5 / 5'
          ELSE progress_text
        END,
        version_text = CASE sort_order
          WHEN 1 THEN 'v2.6.0'
          WHEN 2 THEN 'v1.3.2'
          WHEN 3 THEN 'v1.1.0'
          WHEN 4 THEN 'v0.9.4'
          WHEN 5 THEN 'v1.0.0'
          ELSE version_text
        END,
        price = CASE sort_order
          WHEN 2 THEN '299'
          WHEN 4 THEN '49'
          ELSE NULL
        END,
        original_price = CASE sort_order
          WHEN 2 THEN '399'
          ELSE NULL
        END,
        primary_url = CASE sort_order
          WHEN 1 THEN COALESCE(github_url, url, 'https://github.com')
          WHEN 2 THEN 'https://github.com'
          WHEN 3 THEN 'https://github.com'
          WHEN 4 THEN 'https://github.com'
          WHEN 5 THEN 'https://github.com'
          ELSE COALESCE(url, github_url, 'https://github.com')
        END,
        primary_label = CASE sort_order
          WHEN 1 THEN 'Open repository'
          WHEN 2 THEN 'View node topology'
          WHEN 3 THEN 'Browse setup notes'
          WHEN 4 THEN 'Read CLI examples'
          WHEN 5 THEN 'Open deployment map'
          ELSE 'View details'
        END,
        secondary_url = github_url,
        secondary_label = 'Source code / external link',
        hero_image_url = COALESCE(NULLIF(cover_url, ''), '/hero.png'),
        contributors_json = CASE sort_order
          WHEN 1 THEN '[{"name":"Lihua Hai","role":"Design / Full-stack","avatar_url":null}]'::jsonb
          WHEN 2 THEN '[{"name":"Lihua Hai","role":"Firmware","avatar_url":null},{"name":"Aze","role":"Automation","avatar_url":null}]'::jsonb
          WHEN 3 THEN '[{"name":"Lihua Hai","role":"Maintainer","avatar_url":null}]'::jsonb
          WHEN 4 THEN '[{"name":"Lihua Hai","role":"Go / Product","avatar_url":null}]'::jsonb
          WHEN 5 THEN '[{"name":"Lihua Hai","role":"Infra","avatar_url":null},{"name":"Faye","role":"Ops Review","avatar_url":null}]'::jsonb
          ELSE contributors_json
        END,
        milestones_json = CASE sort_order
          WHEN 1 THEN '[{"date":"2026-03","title":"Content model refresh","desc":"Expanded works into a complete project entity with slug, contributors, milestones, CTAs, and long-form detail content.","link":null},{"date":"2026-04","title":"Scene system integration","desc":"Added reusable background, weather, and filter layers for Moments and project detail pages.","link":null},{"date":"2026-05","title":"Dashboard scene controls","desc":"Moved background configuration into a dedicated dashboard control surface.","link":null}]'::jsonb
          WHEN 2 THEN '[{"date":"2025-12","title":"Messaging contract locked","desc":"Finalized MQTT topic structure between the gateway and edge nodes.","link":null},{"date":"2026-02","title":"Home Assistant integration","desc":"Added local discovery and reliable device state reporting.","link":null}]'::jsonb
          WHEN 3 THEN '[{"date":"2025-10","title":"Installer automation","desc":"Compressed a fresh workstation setup into a scripted twenty-minute flow.","link":null},{"date":"2026-01","title":"Theme tokens aligned","desc":"Unified shell, editor, and desktop visuals with a shared variable system.","link":null}]'::jsonb
          WHEN 4 THEN '[{"date":"2026-01","title":"Offline cache shipped","desc":"Switched day-to-day querying to an offline-first model.","link":null},{"date":"2026-02","title":"Terminal UX polish","desc":"Improved rating, status switching, and shell completion.","link":null}]'::jsonb
          WHEN 5 THEN '[{"date":"2025-11","title":"Media services online","desc":"Brought Jellyfin and OpenMediaVault into a stable shared deployment.","link":null},{"date":"2026-01","title":"Remote access hardened","desc":"Added Tailscale and DNS filtering for safer external access.","link":null}]'::jsonb
          ELSE milestones_json
        END,
        gallery_json = '[]'::jsonb,
        is_published = TRUE
    `)

    console.log('[seed] inserting settings...')
    await client.query(`
      INSERT INTO settings (key, value, description) VALUES
        ('site.name',      '"Lihua Hai"', 'Site name'),
        ('site.slogan',    '"Build a life in public"', 'Site slogan'),
        ('site.bio',       '"Embedded engineer, full-stack builder, and open-source tinkerer."', 'Short biography'),
        ('site.avatar',    'null', 'Avatar URL'),
        ('site.hero_bg',   'null', 'Legacy hero background image URL'),
        ('site.github',    '"https://github.com"', 'GitHub profile URL'),
        ('site.email',     '"hello@lihuahai.dev"', 'Contact email')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `)

    await client.query(`
      INSERT INTO settings (key, value, description) VALUES
        (
          'site.background_scene',
          '{"image":{"url":null,"position":"center center","size":"cover","opacity":0.56},"weather":{"preset":"storm","intensity":0.62},"filter":{"overlay":0.34,"gradient":0.12,"tintColor":"#e2e8f0","blur":8,"noise":0.08,"vignette":0.22}}',
          'Global background scene settings'
        )
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `)

    await client.query('COMMIT')
    console.log('')
    console.log('[seed] completed successfully')
    console.log('   posts: 15 (14 published + 1 draft)')
    console.log('   comments: 6 (4 approved + 2 pending)')
    console.log('   moments: 11')
    console.log('   anime: 6')
    console.log('   games: 6')
    console.log('   gallery: 5')
    console.log('   works: 5')
    console.log('   links: 10')
    console.log('   settings: 8')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[seed] 失败，已回滚：', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
