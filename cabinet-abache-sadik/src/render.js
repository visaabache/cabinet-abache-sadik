// HTML for articles written in the admin dashboard. The page header, menu and
// footer are taken from an existing static article so dynamic articles always
// match the rest of the site.

import { CATEGORIES, escapeHtml as e } from "./content.js";

const SITE = "https://cabinetabache-sadik.com";
const PHONE = "212661508837";
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"];
const LAYOUT_SOURCE = "/article-contrat-travail-maroc";

let layoutCache = null;
async function layout(env, origin) {
  if (!layoutCache) {
    const page = await (await env.ASSETS.fetch(new Request(origin + LAYOUT_SOURCE))).text();
    const cut = (from, to) => page.slice(page.indexOf(from), page.indexOf(to));
    layoutCache = {
      assets: cut('<link rel="preconnect"', "</head>"),
      chrome: cut("<body>", '<main id="main">'),
      footer: cut('<footer class="site-footer">', '<a class="wa-float"'),
    };
  }
  return layoutCache;
}

export function dateAr(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function minutes(post) {
  const words = [post.answer, post.body.replace(/<[^>]+>/g, " "), ...post.faq.flatMap((f) => [f.q, f.a])]
    .join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

function readTime(n) {
  return n === 2 ? "دقيقتان قراءة" : n <= 10 ? `${n} دقائق قراءة` : `${n} دقيقة قراءة`;
}

function fullTitle(post) {
  return post.subtitle && !/[؟?]$/.test(post.title) ? `${post.title}: ${post.subtitle}` : post.title;
}

function whatsapp(post) {
  return `https://wa.me/${PHONE}?text=` + encodeURIComponent(`مرحباً، قرأت مقال «${fullTitle(post)}» وأودّ حجز استشارة.`);
}

function ld(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2).replace(/</g, "\\u003c")}\n</script>`;
}

export async function renderArticle(env, origin, post, related) {
  const { assets, chrome, footer } = await layout(env, origin);
  const url = `${SITE}/${post.slug}`;
  const cat = CATEGORIES[post.category] || "";
  const title = fullTitle(post);
  const wa = whatsapp(post);
  const enc = encodeURIComponent(url);
  const mins = minutes(post);

  const answer = post.answer ? `<div class="info-box">
<div class="info-box-title"><i class="fa-solid fa-circle-check"></i> الجواب باختصار</div>
<p>${e(post.answer)}</p>
</div>
<div class="service-cta">
<h3>عندكم نفس المشكل؟</h3>
<p>صيفطو لينا وضعيتكم فواتساب، ونجاوبوكم ونشرحو ليكم الخطوات المناسبة لحالتكم. الاستشارة الأولى مجانية.</p>
<a class="btn btn-brass" href="${wa}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> سولو محامي فواتساب</a>
</div>` : "";

  const toc = [...post.toc];
  const faq = post.faq.length ? `<h2 id="faq">أسئلة شائعة</h2>
<div class="faq">
${post.faq.map((f) => `<details><summary>${e(f.q)}</summary><div class="answer"><p>${e(f.a)}</p></div></details>`).join("\n")}
</div>` : "";
  if (post.faq.length) toc.push({ id: "faq", text: "أسئلة شائعة" });

  const lds = [
    ld({
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: title, description: post.description, datePublished: post.date, dateModified: post.updated_at.slice(0, 10),
      inLanguage: "ar", articleSection: cat, keywords: post.keywords,
      author: { "@type": "Organization", name: "فريق مكتب عباش وصديق للمحاماة", url: SITE + "/" },
      publisher: { "@type": "Organization", name: "مكتب عباش وصديق للمحاماة", logo: { "@type": "ImageObject", url: SITE + "/img/logo.png" } },
      image: SITE + "/og-image.jpg", mainEntityOfPage: url,
    }),
    ld({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "المدونة", item: SITE + "/blog" },
        { "@type": "ListItem", position: 3, name: title, item: url },
      ],
    }),
  ];
  if (post.faq.length) {
    lds.push(ld({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    }));
  }

  const relatedHtml = related.length ? `<section class="related" aria-labelledby="related-h">
        <h2 id="related-h">مقالات ذات صلة</h2>
        <ul class="related-list">${related.map((r) => `<li><h3><a href="/${r.slug}">${e(fullTitle(r))}</a></h3><p>${e(CATEGORIES[r.category] || "")}، ${dateAr(r.date)}</p></li>`).join("")}</ul>
      </section>` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)} | مكتب عباش وصديق للمحاماة</title>
<meta name="description" content="${e(post.description)}">
<link rel="canonical" href="${url}">
${post.status !== "published" ? '<meta name="robots" content="noindex">\n' : ""}<meta property="og:type" content="article">
<meta property="og:locale" content="ar_MA">
<meta property="og:site_name" content="Cabinet Abache &amp; Sadik – مكتب عباش وصديق">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(post.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta property="article:published_time" content="${post.date}">
<meta property="article:section" content="${e(cat)}">
<meta name="twitter:card" content="summary_large_image">
${lds.join("\n")}
${assets}</head>
${chrome}<main id="main">
<header class="page-hero">
  <div class="wrap">
    <ol class="crumbs"><li><a href="/">الرئيسية</a></li><li><a href="/blog">المدونة</a></li><li><a href="/blog?cat=${e(post.category)}">${e(cat)}</a></li></ol>
    <h1>${e(post.title)}${post.subtitle ? `<span>${e(post.subtitle)}</span>` : ""}</h1>
    <div class="hero-meta"><span>${dateAr(post.date)}</span><span>${readTime(mins)}</span><span>بقلم <strong>فريق المكتب</strong></span></div>
  </div>
</header>
<div class="wrap article-layout">
  <div>
    <article class="prose">
${answer}
${post.body}
${faq}
    </article>
    <div class="article-foot">
      ${post.keywords.length ? `<div class="tags">${post.keywords.map((k) => `<span>#${e(k.replace(/\s+/g, "_"))}</span>`).join("")}</div>` : ""}
      <div class="share">
        <span class="share-label">شاركوا المقال</span>
        <a href="https://wa.me/?text=${encodeURIComponent(title + " " + url)}" target="_blank" rel="noopener" aria-label="مشاركة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc}" target="_blank" rel="noopener" aria-label="مشاركة على LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${enc}" target="_blank" rel="noopener" aria-label="مشاركة على فيسبوك"><i class="fa-brands fa-facebook-f"></i></a>
        <button type="button" data-copy-link="${url}" aria-label="نسخ رابط المقال"><i class="fa-solid fa-link"></i></button>
      </div>
      <div class="author">
        <div class="author-mark" aria-hidden="true"></div>
        <div><h2>فريق مكتب عباش وصديق للمحاماة</h2><p>محامون متخصصون في القانون التجاري والعقاري والمدني وقانون الأسرة، مع خبرة أمام مختلف المحاكم المغربية.</p></div>
      </div>
      ${relatedHtml}
    </div>
  </div>
  <aside class="article-side">
    ${toc.length ? `<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">في هذا المقال</h2><ol>${toc.map((t) => `<li><a href="#${t.id}">${e(t.text)}</a></li>`).join("")}</ol></nav>` : ""}
    <div class="consult-card">
      <h2>استشارة في ${e(cat)}</h2>
      <p>الاستشارة الأولى مع أحد الشريكين مجانية.</p>
      <a class="btn btn-brass" href="${wa}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> واتساب</a>
      <a class="btn btn-ghost" href="/?topic=${encodeURIComponent(cat)}#contact">نموذج التواصل</a>
      <a class="phone" href="tel:+${PHONE}">0661 50 88 37</a>
    </div>
  </aside>
</div>
<section class="cta-band" aria-labelledby="cta-h">
  <div class="wrap">
    <div><h2 id="cta-h">هل تواجهون وضعية مشابهة؟</h2><p>نستمع إليكم في استشارة أولى مجانية، ونوضح لكم خياراتكم القانونية.</p></div>
    <div class="cta-actions">
      <a class="btn btn-brass" href="${wa}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> راسلونا عبر واتساب</a>
      <a class="btn btn-ghost" href="tel:+${PHONE}"><i class="fa-solid fa-phone"></i> <span class="ltr">0661 50 88 37</span></a>
    </div>
  </div>
</section>
</main>
${footer}<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="راسلونا عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>
<div class="action-bar">
  <a class="btn btn-ink" href="tel:+${PHONE}"><i class="fa-solid fa-phone"></i> اتصال</a>
  <a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> واتساب</a>
</div>
<script src="/js/site.js" defer></script>
<script src="/js/motion.js" defer></script>
<script src="/js/protect.js" defer></script>
</body>
</html>
`;
}

function excerpt(post) {
  return post.answer || post.description;
}

export function blogRows(posts) {
  return posts.map((p) => `<article class="post-row" data-post data-cat="${e(p.category)}">
            <div class="post-date">${dateAr(p.date)}</div>
            <div>
              <span class="post-cat">${e(CATEGORIES[p.category] || "")}</span>
              <h3><a href="/${p.slug}">${e(fullTitle(p))}</a></h3>
              <p>${e(excerpt(p))}</p>
              <div class="post-meta"><span>${readTime(minutes(p))}</span></div>
            </div>
          </article>`).join("");
}

export function latestCards(posts) {
  return posts.map((p) => `<article>
        <span class="post-cat">${e(CATEGORIES[p.category] || "")}</span>
        <h3><a href="/${p.slug}">${e(fullTitle(p))}</a></h3>
        <p>${e(excerpt(p))}</p>
        <div class="post-meta"><span>${dateAr(p.date)}</span><span>${readTime(minutes(p))}</span></div>
      </article>`).join("");
}

export function sitemapUrls(posts) {
  return posts.map((p) => `  <url><loc>${SITE}/${p.slug}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod><priority>0.7</priority></url>\n`).join("");
}
