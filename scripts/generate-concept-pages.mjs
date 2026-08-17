import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const dataPath = resolve(rootDir, 'public/data/concepts-101.json');
const outputDir = resolve(rootDir, 'public/concepts');
const sitemapPath = resolve(rootDir, 'public/sitemap.xml');
const siteUrl = 'https://rickluo94.github.io/pickleball-tactical-analysis';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeScript(value) {
  return String(value).replaceAll('</script', '<\\/script');
}

function slugFor(article) {
  return article.id.toLowerCase();
}

function articleUrl(article) {
  return `${siteUrl}/concepts/${slugFor(article)}.html`;
}

function articleDescription(article) {
  return `${article.episode}｜${article.title}：${article.body.slice(0, 2).join('')}`.slice(0, 155);
}

function articleKeywords(article) {
  return ['匹克球', 'Pickleball', article.episode, article.level, article.topic, ...article.hashtags]
    .filter(Boolean)
    .join(', ');
}

function renderJsonLd(article) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: `${article.episode}｜${article.title}`,
    description: articleDescription(article),
    url: articleUrl(article),
    mainEntityOfPage: articleUrl(article),
    articleSection: article.topic,
    keywords: articleKeywords(article),
    inLanguage: 'zh-Hant',
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'Pickle Today｜觀念101',
      url: `${siteUrl}/concepts-101.html`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Pickle Today',
      url: siteUrl,
    },
  }, null, 2);
}

function renderArticlePage(article, previousArticle, nextArticle) {
  const title = `${article.episode}｜${article.title}`;
  const description = articleDescription(article);
  const keywords = articleKeywords(article);

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="../favicon.ico?v=20260714-lime" sizes="any" type="image/x-icon" />
    <link rel="icon" href="../favicon.png?v=20260714-lime" type="image/png" />
    <title>${escapeHtml(title)}｜Pickle Today 觀念101</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(keywords)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(articleUrl(article))}" />
    <meta property="og:title" content="${escapeHtml(title)}｜Pickle Today 觀念101" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(articleUrl(article))}" />
    <meta property="og:locale" content="zh_TW" />
    <meta name="twitter:card" content="summary" />
    <script type="application/ld+json">${escapeScript(renderJsonLd(article))}</script>
    <style>
      *{box-sizing:border-box}
      body{margin:0;font-family:system-ui,-apple-system,"Noto Sans TC",Arial,sans-serif;background:#f7faf7;color:#183a27}
      .page{width:min(840px,calc(100% - 32px));margin:0 auto;padding:28px 0 48px}
      .nav{display:flex;justify-content:space-between;gap:12px;margin-bottom:20px}
      .nav a{color:#2563eb;font-weight:800;text-decoration:none}
      .article{padding:28px;border:1px solid #dce8dc;border-radius:8px;background:#fff;box-shadow:0 10px 24px rgba(24,58,39,.08)}
      .meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
      .meta span{padding:5px 10px;border-radius:999px;background:#eef7eb;color:#38613e;font-size:13px;font-weight:900}
      h1{margin:0 0 24px;font-size:clamp(30px,5vw,46px);line-height:1.18}
      .body{display:grid;gap:14px;font-size:19px;line-height:1.9;color:#26352b}
      p{margin:0}
      .footer{display:grid;gap:12px;margin-top:28px;padding-top:18px;border-top:1px solid #e6eee4;font-weight:900}
      .tags{display:flex;flex-wrap:wrap;gap:8px;color:#2563eb;font-size:14px}
      .pager{display:flex;justify-content:space-between;gap:12px;margin-top:18px}
      .pager a{display:inline-flex;align-items:center;min-height:40px;padding:8px 12px;border-radius:8px;background:#eef7eb;color:#244a35;font-weight:900;text-decoration:none}
      @media(max-width:560px){.page{width:min(100% - 20px,840px);padding-top:16px}.article{padding:18px}.body{font-size:17px}.pager{display:grid}}
    </style>
  </head>
  <body>
    <main class="page">
      <nav class="nav" aria-label="文章導覽">
        <a href="../concepts-101.html">← 觀念101</a>
        <a href="../index.html">Pickle Today</a>
      </nav>
      <article class="article">
        <div class="meta">
          <span>${escapeHtml(article.episode)}</span>
          <span>${escapeHtml(article.level)}</span>
          <span>${escapeHtml(article.topic)}</span>
        </div>
        <h1>${escapeHtml(title)}</h1>
        <div class="body">
          ${article.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n          ')}
        </div>
        <footer class="footer">
          <p>${escapeHtml(`${article.episode}｜${article.level}｜${article.topic}`)}</p>
          <div class="tags" aria-label="文章標籤">
            ${article.hashtags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('\n            ')}
          </div>
        </footer>
      </article>
      <nav class="pager" aria-label="上一篇下一篇">
        ${previousArticle ? `<a href="./${slugFor(previousArticle)}.html">← ${escapeHtml(previousArticle.episode)}</a>` : '<span></span>'}
        ${nextArticle ? `<a href="./${slugFor(nextArticle)}.html">${escapeHtml(nextArticle.episode)} →</a>` : '<span></span>'}
      </nav>
    </main>
  </body>
</html>
`;
}

async function updateSitemap(articles) {
  const sitemap = await readFile(sitemapPath, 'utf8');
  const existingUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const articleUrls = articles.map(articleUrl);
  const urls = [...new Set([...existingUrls, ...articleUrls])];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeHtml(url)}</loc>
  </url>`).join('\n')}
</urlset>
`;

  await writeFile(sitemapPath, xml, 'utf8');
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const articles = [...data.articles].sort((a, b) => a.episode.localeCompare(b.episode, 'zh-Hant', { numeric: true }));

await mkdir(outputDir, { recursive: true });

await Promise.all(articles.map((article, index) => {
  const previousArticle = articles[index - 1] ?? null;
  const nextArticle = articles[index + 1] ?? null;
  return writeFile(
    resolve(outputDir, `${slugFor(article)}.html`),
    renderArticlePage(article, previousArticle, nextArticle),
    'utf8',
  );
}));

await updateSitemap(articles);

console.log(`Generated ${articles.length} concept article pages.`);
