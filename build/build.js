/*
 * 1.1 预渲染脚本
 * 作用：把 content.js 里的文字直接写进 HTML，生成中文首页、/en/、/id/ 三套静态页面。
 * 这样即使 AI 爬虫不执行 JavaScript，也能读到完整标题、产品、服务和联系方式。
 *
 * 用法：在网站根目录运行
 *   node build/build.js
 * 或
 *   npm run build
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://yimiaohuanyu.com';
const TODAY = new Date().toISOString().slice(0, 10);

function loadContent() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8'), sandbox, { filename: 'content.js' });
  return sandbox.window.siteContent;
}

const d = loadContent();

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[ch]));

const readPath = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);
const t = (lang, key) => readPath(d.locales[lang], key) ?? readPath(d.locales.zh, key) ?? '';
const l = (lang, localized) => localized?.[lang] ?? localized?.zh ?? '';

const optimized = (url) => {
  if (!url) return '';
  if (/\/optimized\//.test(url) || /\.webp$/i.test(url)) return url;
  return url.replace(/^\/?assets\//, '/assets/optimized/').replace(/\.(png|jpe?g)$/i, '.webp');
};

const pages = [
  { lang: 'zh', htmlLang: 'zh-CN', dir: '', url: `${SITE_URL}/`, ogLocale: 'zh_CN' },
  { lang: 'en', htmlLang: 'en', dir: 'en', url: `${SITE_URL}/en/`, ogLocale: 'en_US' },
  { lang: 'id', htmlLang: 'id', dir: 'id', url: `${SITE_URL}/id/`, ogLocale: 'id_ID' }
];

function headMeta(page) {
  const meta = d.siteMeta[page.lang];
  const alternates = [
    `<link rel="alternate" hreflang="zh-CN" href="${SITE_URL}/">`,
    `<link rel="alternate" hreflang="en" href="${SITE_URL}/en/">`,
    `<link rel="alternate" hreflang="id" href="${SITE_URL}/id/">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL}/">`
  ].join('\n  ');
  const localeAlternates = pages
    .filter((item) => item.lang !== page.lang)
    .map((item) => `<meta property="og:locale:alternate" content="${item.ogLocale}">`)
    .join('\n  ');
  return `${alternates}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(d.company.name)}">
  <meta property="og:title" content="${esc(meta.title)}">
  <meta property="og:description" content="${esc(meta.description)}">
  <meta property="og:url" content="${page.url}">
  <meta property="og:locale" content="${page.ogLocale}">
  ${localeAlternates}
  <meta property="og:image" content="${SITE_URL}/assets/hvac-materials-hero.jpg">
  <meta property="og:image:width" content="1686">
  <meta property="og:image:height" content="933">
  <meta property="og:image:alt" content="${esc(t(page.lang, 'hero.title').replace(/<br\s*\/?>/gi, ' '))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(meta.title)}">
  <meta name="twitter:description" content="${esc(meta.description)}">
  <meta name="twitter:image" content="${SITE_URL}/assets/hvac-materials-hero.jpg">`;
}

function jsonLd(page) {
  const meta = d.siteMeta[page.lang];
  const orgId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;
  const webPageId = `${page.url}#webpage`;
  const heroImage = `${SITE_URL}/assets/optimized/hvac-materials-hero.webp`;

  const organization = {
    '@type': 'Organization',
    '@id': orgId,
    name: d.company.name,
    url: `${SITE_URL}/`,
    description: meta.description,
    email: 'yimiaohuanyu@gmail.com',
    telephone: d.company.contact[0],
    logo: `${SITE_URL}/favicon.svg`,
    address: { '@type': 'PostalAddress', addressCountry: 'ID' },
    areaServed: { '@type': 'Country', name: 'Indonesia' },
    knowsLanguage: ['zh-CN', 'en', 'id'],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: d.company.contact[0],
        email: d.company.contact[2],
        contactType: 'sales',
        areaServed: 'ID',
        availableLanguage: ['zh-CN', 'en', 'id']
      }
    ]
  };

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${SITE_URL}/`,
    name: d.company.name,
    description: meta.description,
    publisher: { '@id': orgId },
    inLanguage: ['zh-CN', 'en', 'id']
  };

  const webPage = {
    '@type': 'WebPage',
    '@id': webPageId,
    url: page.url,
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': websiteId },
    about: { '@id': orgId },
    inLanguage: page.htmlLang,
    primaryImageOfPage: { '@type': 'ImageObject', url: heroImage }
  };

  const products = {
    '@type': 'ItemList',
    '@id': `${page.url}#products`,
    name: t(page.lang, 'products.title').replace(/<br\s*\/?>/gi, ' '),
    numberOfItems: d.products.length,
    itemListElement: d.products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: l(page.lang, product.name),
        description: l(page.lang, product.text),
        image: `${SITE_URL}${optimized(product.image)}`,
        category: t(page.lang, `products.categories.${product.category}`),
        url: `${page.url}#products`
      }
    }))
  };

  const services = {
    '@type': 'ItemList',
    '@id': `${page.url}#services`,
    name: t(page.lang, 'support.title').replace(/<br\s*\/?>/gi, ' '),
    itemListElement: d.support.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: l(page.lang, item.title),
        description: l(page.lang, item.text),
        provider: { '@id': orgId }
      }
    }))
  };

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [organization, website, webPage, products, services]
  }, null, 2).replace(/</g, '\\u003c');
}

function languageOptions(lang) {
  return ['zh', 'en', 'id'].map((code) => {
    const name = t(lang, `labels.languageNames.${code}`);
    return `<option value="${code}"${code === lang ? ' selected' : ''}>${esc(name)}</option>`;
  }).join('\n        ');
}

function renderStats(lang) {
  const stats = t(lang, 'stats');
  if (!Array.isArray(stats)) return '';
  return stats.map((item) => `
        <article class="stat"><strong>${esc(item.number)}<small>${esc(item.suffix)}</small></strong><span>${esc(item.label)}</span></article>`).join('');
}

function renderProductFilter(lang) {
  return d.productCategories.map((key) => `
        <button data-category="${esc(key)}" class="${key === 'all' ? 'active' : ''}">${esc(t(lang, `products.categories.${key}`))}</button>`).join('');
}

function renderProducts(lang) {
  return d.products.map((product) => {
    const name = l(lang, product.name);
    const text = l(lang, product.text);
    const category = t(lang, `products.categories.${product.category}`);
    const image = product.image
      ? `<img class="product-image optional-image image-loaded" src="${esc(optimized(product.image))}" alt="${esc(name)}" loading="lazy" decoding="async">`
      : '';
    return `
        <article class="product-card ${esc(product.tone || 'dark')}"
          data-detail-title="${esc(name)}" data-detail-body="${esc(text)}" data-detail-image="${esc(product.image)}">
          ${image}
          <div class="product-art"><i></i><i></i></div>
          <div class="product-info"><small>${esc(product.no)} · ${esc(category)}</small>
            <h3>${esc(name)}</h3><p>${esc(text)}</p>
            <button class="product-detail-trigger" type="button" aria-label="${esc(t(lang, 'labels.moreAbout') + ' ' + name)}">↗</button>
          </div>
        </article>`;
  }).join('');
}

function renderSolutions(lang) {
  return d.solutions.map((solution, index) => {
    const title = l(lang, solution.title);
    const style = solution.image ? ` style="--solution:url('${esc(solution.image)}')"` : '';
    const image = solution.image
      ? `<img class="solution-thumb optional-image image-loaded" src="${esc(optimized(solution.image))}" alt="${esc(title)}" loading="lazy" decoding="async">`
      : '';
    return `
        <button type="button" class="solution-item"${style}
          data-detail-title="${esc(title)}" data-detail-image="${esc(solution.image)}">
          ${image}
          <span>0${index + 1}</span><strong>${esc(title)}</strong><b>↗</b>
        </button>`;
  }).join('');
}

function renderSupport(lang) {
  return d.support.map((item) => {
    const title = l(lang, item.title);
    const text = l(lang, item.text);
    const badge = item.label ? l(lang, item.label) : item.icon;
    const image = item.image
      ? `<img class="support-thumb optional-image image-loaded" src="${esc(optimized(item.image))}" alt="${esc(title)}" loading="lazy" decoding="async">`
      : '';
    return `
        <button type="button" class="support-card" data-detail-title="${esc(title)}" data-detail-body="${esc(text)}" data-detail-image="${esc(item.image || '')}">
          ${image}
          <b>${esc(badge)}</b><h3>${esc(title)}</h3><p>${esc(text)}</p><i>↗</i>
        </button>`;
  }).join('');
}

function renderGallery(lang) {
  return d.gallery.map((item) => {
    const title = l(lang, item.title);
    const image = item.image
      ? `<img class="gallery-image optional-image image-loaded" src="${esc(optimized(item.image))}" alt="${esc(title)}" loading="lazy" decoding="async">`
      : '';
    const open = image
      ? ` data-gallery-image="${esc(item.image)}" data-gallery-title="${esc(title)}" tabindex="0" role="button" aria-label="${esc(title)}"`
      : '';
    return `<figure class="${esc(item.size)}${image ? ' has-gallery-image' : ' is-empty'}"${open}>${image}<figcaption>${esc(title)}</figcaption></figure>`;
  }).join('\n        ');
}

function renderContactLinks(lang) {
  return d.contactLinks.map((item) => item.type === 'qr' ? `
        <div class="contact-link qr"><button class="qr-zoom" type="button" aria-label="${esc(l(lang, item.label))} - ${esc(t(lang, 'labels.enlargeQr'))}"><img src="${esc(item.image)}" alt="${esc(l(lang, item.label))}"></button><div><strong>${esc(l(lang, item.label))}</strong><small>${esc(l(lang, item.note))}</small></div></div>` : `
        <a class="contact-link" href="${esc(item.url)}" target="_blank" rel="noopener"><div><strong>${esc(l(lang, item.label))}</strong><small>${esc(l(lang, item.note))}</small></div><b>${esc(item.icon || '↗')}</b></a>`).join('');
}

function renderFooterContact() {
  return d.company.contact.map((contact) => `<span>${esc(contact)}</span>`).join('');
}

function renderPage(page) {
  const meta = d.siteMeta[page.lang];
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  const replacements = {
    htmlLang: page.htmlLang,
    metaTitle: esc(meta.title),
    metaDescription: esc(meta.description),
    metaKeywords: esc(meta.keywords),
    canonical: page.url,
    headMeta: headMeta(page),
    jsonLd: jsonLd(page),
    languageOptions: languageOptions(page.lang),
    stats: renderStats(page.lang),
    productFilter: renderProductFilter(page.lang),
    productsGrid: renderProducts(page.lang),
    solutionsList: renderSolutions(page.lang),
    supportGrid: renderSupport(page.lang),
    galleryGrid: renderGallery(page.lang),
    contactLinks: renderContactLinks(page.lang),
    footerContact: renderFooterContact(),
    'company.name': esc(d.company.name),
    copyright: esc(d.company.copyright),
    contactMainLink: esc(d.contactMainLink)
  };

  let html = template
    .replace(/\{\{t:([^}]+)\}\}/g, (_, key) => esc(t(page.lang, key)))
    .replace(/\{\{h:([^}]+)\}\}/g, (_, key) => t(page.lang, key));

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

for (const page of pages) {
  const dir = page.dir ? path.join(ROOT, page.dir) : ROOT;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderPage(page), 'utf8');
  console.log(`wrote ${path.relative(ROOT, path.join(dir, 'index.html'))}`);
}

fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /build/

# AI search and assistants: allow crawling
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_URL}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/"/>
    <xhtml:link rel="alternate" hreflang="id" href="${SITE_URL}/id/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>
  </url>
  <url>
    <loc>${SITE_URL}/en/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_URL}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/"/>
    <xhtml:link rel="alternate" hreflang="id" href="${SITE_URL}/id/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>
  </url>
  <url>
    <loc>${SITE_URL}/id/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE_URL}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/"/>
    <xhtml:link rel="alternate" hreflang="id" href="${SITE_URL}/id/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>
  </url>
</urlset>
`, 'utf8');

const productLines = d.products.map((product) => `- ${l('en', product.name)}: ${l('en', product.text)}`).join('\n');
fs.writeFileSync(path.join(ROOT, 'llms.txt'), `# PT. YIMIAO HUANYU TECHNOLOGY INDONESIA

> HVAC materials supplier in Indonesia. Copper tubes, copper fittings, insulation, PU duct panels and refrigerants, with warehouse stock, delivery, installation and after-sales support.

Canonical: ${SITE_URL}/
Languages: zh-CN (${SITE_URL}/), en (${SITE_URL}/en/), id (${SITE_URL}/id/)
Contact: +62 811-1008-6666, +62 811-1008-7777, yimiaohuanyu@gmail.com

## Main pages
- [Chinese home](${SITE_URL}/): 印尼冷暖辅材、铜管、保温材料、PU 系列与制冷剂供应。
- [English home](${SITE_URL}/en/): HVAC materials supplier in Indonesia.
- [Indonesian home](${SITE_URL}/id/): Supplier material HVAC di Indonesia.

## Products
${productLines}

## Services
- Product inquiry and product selection
- After-sales service and technical support
- Product catalogues and technical documents

## Notes
- This site is public and welcomes search engine and AI assistant crawling.
- Please use the canonical URLs above when citing the company or products.
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'CNAME'), 'yimiaohuanyu.com\n', 'utf8');
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '', 'utf8');
fs.writeFileSync(path.join(ROOT, '_headers'), `/*
  X-Robots-Tag: index, follow, max-image-preview:large, max-snippet:-1
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=86400
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#EAF5FF"/>
  <path d="M18 16h9l5 12 5-12h9L34 38v10h-4V38L18 16z" fill="#17466E"/>
</svg>
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'package.json'), JSON.stringify({
  name: 'yimiaohuanyu-site',
  private: true,
  version: '1.1.0',
  scripts: { build: 'node build/build.js' }
}, null, 2) + '\n', 'utf8');

console.log('wrote robots.txt, sitemap.xml, llms.txt, CNAME, _headers, favicon.svg, package.json');
