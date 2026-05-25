-- ============================================================
-- 梨花海 (Lihua Hai) — 数据库 Schema
-- 数据库: PostgreSQL 16+
-- 执行方式: npm run db:migrate
-- ============================================================

-- 启用 UUID 扩展（备用）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 文章表
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  title          TEXT        NOT NULL,
  slug           TEXT        NOT NULL UNIQUE,
  -- Tiptap JSON 内容，存为 JSONB 以支持索引和查询
  content        JSONB       NOT NULL DEFAULT '{}',
  excerpt        TEXT,
  cover_url      TEXT,
  cover_alt      TEXT,
  seo_title      TEXT,
  seo_description TEXT,
  is_featured    BOOLEAN     NOT NULL DEFAULT FALSE,
  status         TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'archived')),
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  category       TEXT        NOT NULL DEFAULT '未分类',
  view_count     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ
);

-- 文章查询常用索引
-- 迁移：为已有数据库添加 category 列（幂等，必须在创建 category 索引之前运行）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '未分类';

CREATE INDEX IF NOT EXISTS idx_posts_slug        ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_status      ON posts (status);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_alt TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_featured    ON posts (is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_published   ON posts (published_at DESC NULLS LAST)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_tags        ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_posts_category    ON posts (category);

-- ============================================================
-- 极客瞬间表
-- ============================================================
CREATE TABLE IF NOT EXISTS moments (
  id          SERIAL PRIMARY KEY,
  type        TEXT        NOT NULL DEFAULT 'text'
                CHECK (type IN ('text','image','sleep','steps','heartrate','mood','link')),
  content     TEXT,
  content_json JSONB,
  images      TEXT[]      NOT NULL DEFAULT '{}',
  -- 扩展数据（手环数据、链接元信息等）
  meta        JSONB,
  mood        TEXT,
  weather     TEXT,
  location    TEXT,
  is_public   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE moments
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE moments
  ADD COLUMN IF NOT EXISTS content_json JSONB;

CREATE INDEX IF NOT EXISTS idx_moments_created ON moments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_type    ON moments (type);

CREATE TABLE IF NOT EXISTS moment_likes (
  id          SERIAL PRIMARY KEY,
  moment_id   INTEGER     NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  visitor_key TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (moment_id, visitor_key)
);

CREATE INDEX IF NOT EXISTS idx_moment_likes_moment ON moment_likes (moment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS moment_comments (
  id          SERIAL PRIMARY KEY,
  moment_id   INTEGER     NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  author_name TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moment_comments_moment
  ON moment_comments (moment_id, created_at DESC);

-- ============================================================
-- 动漫表
-- ============================================================
CREATE TABLE IF NOT EXISTS animes (
  id                SERIAL PRIMARY KEY,
  title             TEXT        NOT NULL,
  title_cn          TEXT,
  cover_url         TEXT,
  type              TEXT        NOT NULL DEFAULT 'tv'
                      CHECK (type IN ('tv','movie','ova','special')),
  episodes_total    INTEGER,
  episodes_watched  INTEGER     NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'plan_to_watch'
                      CHECK (status IN ('watching','completed','on_hold','dropped','plan_to_watch')),
  rating            NUMERIC(3,1) CHECK (rating >= 1 AND rating <= 10),
  short_review      TEXT,
  start_season      TEXT,
  mal_id            INTEGER UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animes_status ON animes (status);
CREATE INDEX IF NOT EXISTS idx_animes_updated ON animes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_animes_status_updated ON animes (status, updated_at DESC);

-- ============================================================
-- 游戏表
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id                   SERIAL PRIMARY KEY,
  title                TEXT        NOT NULL,
  cover_url            TEXT,
  cartridge_image_url  TEXT,
  platform             TEXT        NOT NULL DEFAULT 'pc'
                         CHECK (platform IN ('pc','ps5','ps4','switch','xbox','mobile','other')),
  status               TEXT        NOT NULL DEFAULT 'plan_to_play'
                         CHECK (status IN ('playing','completed','abandoned','plan_to_play','platinum')),
  play_hours           NUMERIC(7,1),
  rating               NUMERIC(3,1) CHECK (rating >= 1 AND rating <= 10),
  short_review         TEXT,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
CREATE INDEX IF NOT EXISTS idx_games_updated ON games (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_status_updated ON games (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_platform_updated ON games (platform, updated_at DESC);

-- ============================================================
-- 相册表
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery_albums (
  id              SERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  description     TEXT,
  cover_image_url TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_albums_sort
  ON gallery_albums (sort_order ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS gallery_items (
  id              SERIAL PRIMARY KEY,
  title           TEXT,
  description     TEXT,
  url             TEXT        NOT NULL,
  thumbnail_url   TEXT,
  width           INTEGER,
  height          INTEGER,
  file_size       BIGINT,
  file_name       TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'photo'
                    CHECK (category IN ('photo','artwork','screenshot','other')),
  -- 从 EXIF 解析出的元数据
  exif            JSONB,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES gallery_albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_category   ON gallery_items (category);
CREATE INDEX IF NOT EXISTS idx_gallery_featured   ON gallery_items (is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_gallery_sort       ON gallery_items (sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_tags       ON gallery_items USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_gallery_album      ON gallery_items (album_id, sort_order, created_at DESC);

-- ============================================================
-- 评论表
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id            SERIAL PRIMARY KEY,
  post_id       INTEGER     NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_name   TEXT        NOT NULL,
  author_email  TEXT,
  parent_id     INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL,
  location_label TEXT,
  browser_label TEXT,
  os_label      TEXT,
  is_by_author  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_approved   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS location_label TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS browser_label TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS os_label TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_by_author BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_comments_post    ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent  ON comments (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_pending ON comments (is_approved, created_at DESC)
  WHERE is_approved = FALSE;

-- ============================================================
-- 友情链接表
-- ============================================================
CREATE TABLE IF NOT EXISTS links (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  description TEXT,
  avatar_url  TEXT,
  category    TEXT        NOT NULL DEFAULT 'friend',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE links DROP CONSTRAINT IF EXISTS links_category_check;

CREATE TABLE IF NOT EXISTS link_categories (
  slug        TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  description TEXT,
  icon        TEXT        NOT NULL DEFAULT 'link',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO link_categories (slug, label, description, icon, sort_order, is_default)
VALUES
  ('friend', '友情链接', '认真写字、长期更新，也愿意把自己的角落打理得舒服的人。', 'group', 0, TRUE),
  ('tool', '常用工具', '真正会被频繁打开的产品和效率工具，安静但很能打。', 'construction', 10, FALSE),
  ('resource', '学习资源', '文档、教程和参考资料，遇到问题时很值得先回到这里。', 'menu_book', 20, FALSE),
  ('inspire', '灵感来源', '能带来审美、表达和想法上的触动，适合慢慢逛。', 'auto_awesome', 30, FALSE),
  ('other', '其他收藏', '不一定容易归类，但确实值得记住的一些地方。', 'interests', 40, FALSE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO link_categories (slug, label, description, icon, sort_order, is_default)
SELECT DISTINCT
  links.category,
  links.category,
  NULL,
  'link',
  100,
  FALSE
FROM links
WHERE links.category IS NOT NULL
  AND links.category <> ''
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_links_category ON links (category);
CREATE INDEX IF NOT EXISTS idx_links_active   ON links (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_link_categories_sort ON link_categories (sort_order, label);

CREATE TABLE IF NOT EXISTS link_submissions (
  id                SERIAL PRIMARY KEY,
  site_name         TEXT        NOT NULL,
  site_url          TEXT        NOT NULL,
  site_description  TEXT,
  site_avatar_url   TEXT,
  site_rss_url      TEXT,
  contact_email     TEXT        NOT NULL,
  contact_note      TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note        TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_submissions_status_created
  ON link_submissions (status, created_at DESC);

-- ============================================================
-- 设置表 — 站点配置（Hero 背景图等）
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key             TEXT        PRIMARY KEY,
  value           JSONB       NOT NULL,
  description     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_updated ON settings (updated_at DESC);

-- ============================================================
-- 自动更新 updated_at 的触发器函数
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 作品表
-- ============================================================
CREATE TABLE IF NOT EXISTS works (
  id          SERIAL PRIMARY KEY,
  title       TEXT        NOT NULL,
  subtitle    TEXT,
  description TEXT,
  cover_url   TEXT        NOT NULL DEFAULT '',
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  url         TEXT,
  github_url  TEXT,
  year        INTEGER,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE works ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS hero_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE works ADD COLUMN IF NOT EXISTS seal TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS status_text TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS progress_text TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS version_text TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS price TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS original_price TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS primary_url TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS primary_label TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS secondary_url TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS secondary_label TEXT;
ALTER TABLE works ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE works ADD COLUMN IF NOT EXISTS contributors_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE works ADD COLUMN IF NOT EXISTS milestones_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE works ADD COLUMN IF NOT EXISTS gallery_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE works ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE works
SET slug = (
  CASE
    WHEN NULLIF(TRIM(BOTH '-' FROM regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), '') IS NULL
      THEN 'work'
    ELSE NULLIF(TRIM(BOTH '-' FROM regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), '')
  END
) || '-' || id
WHERE slug IS NULL OR slug = '';

UPDATE works
SET summary = COALESCE(summary, description)
WHERE summary IS NULL;

UPDATE works
SET hero_image_url = CASE
  WHEN hero_image_url = '' THEN cover_url
  ELSE hero_image_url
END
WHERE hero_image_url = '' OR hero_image_url IS NULL;

ALTER TABLE works ALTER COLUMN slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_works_sort ON works(sort_order ASC, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_works_slug ON works (slug);
CREATE INDEX IF NOT EXISTS idx_works_published_sort ON works (is_published, sort_order ASC, created_at DESC);

-- 绑定触发器
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_posts_updated_at
      BEFORE UPDATE ON posts
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_animes_updated_at'
  ) THEN
    CREATE TRIGGER trg_animes_updated_at
      BEFORE UPDATE ON animes
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_games_updated_at'
  ) THEN
    CREATE TRIGGER trg_games_updated_at
      BEFORE UPDATE ON games
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_works_updated_at'
  ) THEN
    CREATE TRIGGER trg_works_updated_at
      BEFORE UPDATE ON works
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END;
$$;
