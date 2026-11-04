// Cloudflare Worker for cabinetabache-sadik.com
//
// Static pages are served from ./public as before. On top of that the Worker:
//   - serves a password-protected admin dashboard at /admin;
//   - stores articles written there in a D1 database (binding DB);
//   - renders those articles at /<slug> with the same layout as the static ones;
//   - adds them to /blog, the home page "latest articles" and /sitemap.xml.
// If the database or the ADMIN_PASSWORD secret is missing, the public site keeps
// working exactly as a static site and /admin explains what to configure.

import adminHtml from "./admin.html";
import { CATEGORIES, sanitizeBody } from "./content.js";
import { renderArticle, blogRows, latestCards, sitemapUrls } from "./render.js";

const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 7;
const MAX_FAILED_LOGINS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/admin" || path === "/admin/") return adminPage(env);
      if (path.startsWith("/api/")) return await api(request, env, url);
      if (path === "/blog") return await withPosts(request, env, injectBlog);
      if (path === "/") return await withPosts(request, env, injectHome);
      if (path === "/sitemap.xml") return await withPosts(request, env, injectSitemap);

      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404 || !env.DB) return asset;
      const slug = path.slice(1);
      if (!SLUG_RE.test(slug)) return asset;
      const post = await getPost(env, slug);
      const preview = url.searchParams.has("preview") && (await isAdmin(request, env));
      if (!post || (post.status !== "published" && !preview)) return asset;
      return html(await renderArticle(env, url.origin, post, await relatedPosts(env, post)), {
        "cache-control": preview ? "no-store" : "public, max-age=60",
        ...(post.status !== "published" ? { "x-robots-tag": "noindex" } : {}),
      });
    } catch (err) {
      console.error(err);
      // Never take the public site down because of the dynamic layer.
      if (!path.startsWith("/api/") && !path.startsWith("/admin")) return env.ASSETS.fetch(request);
      return json({ error: "خطأ في الخادم، أعيدوا المحاولة." }, 500);
    }
  },
};

// ---------------------------------------------------------------- database

let schemaReady = false;
async function db(env) {
  if (!env.DB) return null;
  if (!schemaReady) {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS posts (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        toc TEXT NOT NULL DEFAULT '[]',
        faq TEXT NOT NULL DEFAULT '[]',
        description TEXT NOT NULL DEFAULT '',
        keywords TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL)`),
    ]);
    schemaReady = true;
  }
  return env.DB;
}

function rowToPost(r) {
  return r && { ...r, toc: JSON.parse(r.toc), faq: JSON.parse(r.faq), keywords: JSON.parse(r.keywords) };
}

async function getPost(env, slug) {
  const d = await db(env);
  return rowToPost(await d.prepare("SELECT * FROM posts WHERE slug = ?").bind(slug).first());
}

async function publishedPosts(env) {
  const d = await db(env);
  if (!d) return [];
  const { results } = await d
    .prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY date DESC, created_at DESC")
    .all();
  return results.map(rowToPost);
}

async function relatedPosts(env, post) {
  const d = await db(env);
  const { results } = await d
    .prepare("SELECT * FROM posts WHERE status = 'published' AND slug != ? ORDER BY (category = ?) DESC, date DESC LIMIT 3")
    .bind(post.slug, post.category)
    .all();
  return results.map(rowToPost);
}

// ---------------------------------------------------------------- public pages

async function withPosts(request, env, inject) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok || !env.DB) return asset;
  const posts = await publishedPosts(env);
  if (!posts.length) return asset;
  const res = await inject(asset, posts, env, new URL(request.url).origin);
  const headers = new Headers(res.headers);
  headers.delete("etag");
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=60");
  return new Response(res.body, { status: res.status, headers });
}

function injectBlog(asset, posts) {
  return new HTMLRewriter()
    .on(".post-list", { element(el) { el.prepend(blogRows(posts), { html: true }); } })
    .transform(asset);
}

async function injectHome(asset, posts, env, origin) {
  const staticCount = await countStaticPosts(env, origin);
  const fresh = posts.slice(0, 3);
  let seen = 0;
  return new HTMLRewriter()
    .on(".latest", { element(el) { el.prepend(latestCards(fresh), { html: true }); } })
    .on(".latest > article", { element(el) { if (++seen > 3 - fresh.length) el.remove(); } })
    .on("#insights .text-link", { element(el) { el.setInnerContent(`جميع المقالات (${staticCount + posts.length})`); } })
    .transform(asset);
}

let staticCountCache = null;
async function countStaticPosts(env, origin) {
  if (staticCountCache === null) {
    const blog = await env.ASSETS.fetch(new Request(origin + "/blog"));
    staticCountCache = ((await blog.text()).match(/data-post /g) || []).length;
  }
  return staticCountCache;
}

async function injectSitemap(asset, posts, env, origin) {
  const xml = await asset.text();
  return new Response(xml.replace("</urlset>", sitemapUrls(posts, origin) + "</urlset>"), asset);
}

// ---------------------------------------------------------------- admin page

function adminPage(env) {
  return html(adminHtml, {
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow",
    "x-frame-options": "DENY",
    "referrer-policy": "same-origin",
    "content-security-policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
}

// ---------------------------------------------------------------- API

async function api(request, env, url) {
  const { pathname: path } = url;
  const method = request.method;
  if (method !== "GET" && request.headers.get("origin") !== url.origin) {
    return json({ error: "طلب غير مسموح." }, 403);
  }
  if (!env.DB || !env.ADMIN_PASSWORD) {
    return json({ error: "not_configured", db: !!env.DB, password: !!env.ADMIN_PASSWORD }, 503);
  }

  if (path === "/api/login" && method === "POST") return login(request, env);
  if (path === "/api/logout" && method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }
  if (path === "/api/session") return json({ authenticated: await isAdmin(request, env) });

  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);

  if (path === "/api/categories") return json(CATEGORIES);
  if (path === "/api/posts" && method === "GET") {
    const { results } = await (await db(env))
      .prepare("SELECT slug, title, category, date, status, updated_at FROM posts ORDER BY date DESC, created_at DESC")
      .all();
    return json(results);
  }
  if (path === "/api/posts" && method === "POST") return savePost(request, env, null);

  const m = path.match(/^\/api\/posts\/([a-z0-9-]+)$/);
  if (m) {
    const slug = m[1];
    if (method === "GET") {
      const post = await getPost(env, slug);
      return post ? json(post) : json({ error: "not_found" }, 404);
    }
    if (method === "PUT") return savePost(request, env, slug);
    if (method === "DELETE") {
      await (await db(env)).prepare("DELETE FROM posts WHERE slug = ?").bind(slug).run();
      return json({ ok: true });
    }
  }
  return json({ error: "not_found" }, 404);
}

async function savePost(request, env, existingSlug) {
  let input;
  try { input = await request.json(); } catch { return json({ error: "بيانات غير صالحة." }, 400); }

  const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const title = text(input.title, 200);
  const category = String(input.category || "");
  const status = input.status === "published" ? "published" : "draft";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || "") ? input.date : new Date().toISOString().slice(0, 10);
  let slug = existingSlug || String(input.slug || "").trim().toLowerCase();

  if (!title) return json({ error: "العنوان إجباري." }, 400);
  if (!CATEGORIES[category]) return json({ error: "اختاروا المجال." }, 400);
  if (!existingSlug) {
    if (!slug) slug = `article-${date.replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
    if (!SLUG_RE.test(slug) || slug.length > 90) {
      return json({ error: "الرابط يقبل فقط الحروف اللاتينية الصغيرة والأرقام والشرطة (-)." }, 400);
    }
    if (["admin", "api", "blog", "sitemap", "index", "robots", "css", "img", "js"].includes(slug)) {
      return json({ error: "هذا الرابط محجوز، اختاروا رابطاً آخر." }, 400);
    }
    const clash = await env.ASSETS.fetch(new Request(new URL(request.url).origin + "/" + slug));
    if (clash.status !== 404 || (await getPost(env, slug))) {
      return json({ error: "هذا الرابط مستعمل من قبل، اختاروا رابطاً آخر." }, 409);
    }
  } else if (!(await getPost(env, slug))) {
    return json({ error: "المقال غير موجود." }, 404);
  }

  const { body, toc } = await sanitizeBody(String(input.body || ""));
  const faq = (Array.isArray(input.faq) ? input.faq : [])
    .map((f) => ({ q: text(f?.q, 300), a: text(f?.a, 2000) }))
    .filter((f) => f.q && f.a)
    .slice(0, 12);
  const keywords = String(input.keywords || "")
    .split(/[،,\n]/)
    .map((k) => text(k, 60))
    .filter(Boolean)
    .slice(0, 10);
  const answer = text(input.answer, 1500);
  const description = text(input.description, 300) || (answer || text(body.replace(/<[^>]+>/g, " "), 400)).slice(0, 160);
  const now = new Date().toISOString();
  const post = {
    slug, title, subtitle: text(input.subtitle, 200), category, date, answer, body,
    toc: JSON.stringify(toc), faq: JSON.stringify(faq), description, keywords: JSON.stringify(keywords), status,
  };

  const d = await db(env);
  if (existingSlug) {
    await d.prepare(`UPDATE posts SET title=?, subtitle=?, category=?, date=?, answer=?, body=?, toc=?, faq=?,
        description=?, keywords=?, status=?, updated_at=? WHERE slug=?`)
      .bind(post.title, post.subtitle, post.category, post.date, post.answer, post.body, post.toc, post.faq,
        post.description, post.keywords, post.status, now, slug)
      .run();
  } else {
    await d.prepare(`INSERT INTO posts (slug, title, subtitle, category, date, answer, body, toc, faq, description,
        keywords, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(post.slug, post.title, post.subtitle, post.category, post.date, post.answer, post.body, post.toc,
        post.faq, post.description, post.keywords, post.status, now, now)
      .run();
  }
  return json({ ok: true, slug, status });
}

// ---------------------------------------------------------------- auth

async function login(request, env) {
  const d = await db(env);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const since = Date.now() - LOGIN_WINDOW_MS;
  await d.prepare("DELETE FROM login_attempts WHERE ts < ?").bind(since).run();
  const { n } = await d.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ts >= ?").bind(ip, since).first();
  if (n >= MAX_FAILED_LOGINS) {
    return json({ error: "محاولات كثيرة. أعيدوا المحاولة بعد 15 دقيقة." }, 429);
  }
  let password = "";
  try { password = String((await request.json()).password || ""); } catch {}
  if (!(await safeEqual(password, env.ADMIN_PASSWORD))) {
    await d.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)").bind(ip, Date.now()).run();
    return json({ error: "كلمة المرور غير صحيحة." }, 401);
  }
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const token = `${exp}.${await sign(String(exp), env.ADMIN_PASSWORD)}`;
  return json({ ok: true }, 200, {
    "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`,
  });
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=(\\d+)\\.([A-Za-z0-9_-]+)`));
  if (!m || Number(m[1]) < Date.now()) return false;
  return safeEqual(m[2], await sign(m[1], env.ADMIN_PASSWORD));
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...mac)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function safeEqual(a, b) {
  // Compare fixed-length digests so the comparison time does not depend on the input.
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(String(s)))));
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}

// ---------------------------------------------------------------- helpers

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function html(body, headers = {}) {
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8", ...headers } });
}
