# لوحة التحكم – إضافة المقالات بدون برمجة

العنوان: **https://cabinetabache-sadik.com/admin**

## الإعداد (مرة واحدة فقط)

1. **قاعدة البيانات:** تُنشأ تلقائياً عند أول نشر للموقع بعد هذا التحديث، باسم `cabinet-abache-blog`.
   يمكنكم التأكد منها في Cloudflare: **Storage & Databases → D1**.
2. **كلمة مرور المسؤول:** في Cloudflare افتحوا **Workers & Pages → lawyer-abache → Settings → Variables and Secrets → Add**:
   - Type: **Secret**
   - Variable name: `ADMIN_PASSWORD`
   - Value: كلمة مرور قوية (12 حرفاً على الأقل)

   ثم **Deploy**. لتغيير كلمة المرور لاحقاً، عدّلوا نفس المتغير؛ وتغييرها يُخرج كل من كان مسجلاً الدخول.

## الاستعمال

- **مقال جديد:** العنوان، والمجال، و«الجواب باختصار»، والنص، والأسئلة الشائعة، ثم **نشر المقال**.
- **حفظ كمسودة:** لا يظهر للزوار. زر «معاينة» يعرضه لكم وحدكم.
- **بعد النشر** يظهر المقال مباشرة (خلال دقيقة على الأكثر):
  في المدونة، وفي «من المدونة القانونية» بالصفحة الرئيسية، وفي `sitemap.xml`.
  أرسلوا رابطه إلى Google Search Console ليُفهرس أسرع.
- **رابط المقال** لا يمكن تغييره بعد الحفظ (حتى لا تنكسر الروابط في Google).
- المقالات التي كانت على الموقع قبل لوحة التحكم جزء من ملفات الموقع ولا تُعدَّل من هنا.

## الحماية

- 8 محاولات دخول خاطئة من نفس العنوان تقفل الدخول 15 دقيقة.
- الجلسة صالحة 7 أيام.
- نص المقال يُنظَّف تلقائياً: تُحذف السكريبتات والصور والتنسيقات غير المسموح بها.

---

## Technical notes

- Deployment: Cloudflare Workers Builds is connected to `visaabache/cabinet-abache-sadik`
  (branch `main`, root directory `cabinet-abache-sadik`, deploy command `npx wrangler deploy`).
  Every push to `main` deploys the site; no manual upload is needed.

- `src/worker.js` handles `/admin`, `/api/*`, articles stored in D1 (`/<slug>`), and injects
  published articles into `/blog`, `/` and `/sitemap.xml`. Every other request goes to
  the static files in `public/` unchanged (`run_worker_first: true`).
- If the `DB` binding or the `ADMIN_PASSWORD` secret is missing, the public site keeps
  working as a static site and `/admin` shows what is missing.
- The D1 schema is created on first use (`CREATE TABLE IF NOT EXISTS`).
- Local development: create `.dev.vars` with `ADMIN_PASSWORD="..."`, then `npm install && npm run dev`.
