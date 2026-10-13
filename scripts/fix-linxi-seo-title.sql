-- Run after backing up this post's SEO title. Preserve its editorial title/body.
UPDATE posts
SET seo_title = 'From Pixel to Porcelain: AI Art with Linxi SmartModel'
WHERE slug = 'from-pixel-to-porcelain-how-linxi-smartmodel-turns-ai-imagination-into-collectible-art'
  AND status = 'published'
  AND seo_title = 'From Pixel to Porcelain: How Linxi SmartModel Turns AI Imagination into Collectible Art';
