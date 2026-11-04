// Categories and article-body cleaning shared by the API and the renderer.

// Same keys as the blog filters in public/blog.html (data-cat / data-filter).
export const CATEGORIES = {
  family: "قانون الأسرة",
  "real-estate": "القانون العقاري",
  compensation: "دعاوى التعويض",
  criminal: "القانون الجنائي",
  labor: "قانون الشغل",
  commercial: "القانون التجاري",
  corporate: "قانون الشركات",
  civil: "القانون المدني",
  administrative: "المنازعات الإدارية",
  arbitration: "التحكيم والوساطة",
  digital: "القانون الرقمي",
  diaspora: "الجالية المغربية",
};

// Tags the editor can produce; anything else is unwrapped (its text is kept).
const ALLOWED = new Set(["p", "h2", "h3", "ul", "ol", "li", "strong", "b", "em", "i", "u", "a", "br", "blockquote"]);
// Tags removed together with everything inside them.
const DROPPED = "script, style, iframe, object, embed, form, input, textarea, select, button, svg, math, link, meta, base, noscript, template, img, video, audio, canvas, head, title";

// Cleans the HTML written in the admin editor so only simple formatting reaches
// the public page, numbers the h2 headings (s1, s2, ...) and returns them as a
// table of contents.
export async function sanitizeBody(input) {
  const toc = [];
  let current = null;
  const res = new HTMLRewriter()
    .onDocument({ comments(c) { c.remove(); }, doctype() {} })
    .on(DROPPED, { element(el) { el.remove(); } })
    .on("*", {
      element(el) {
        if (el.removed) return;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED.has(tag)) { el.removeAndKeepContent(); return; }
        const href = tag === "a" ? safeHref(el.getAttribute("href")) : null;
        for (const [name] of [...el.attributes]) el.removeAttribute(name);
        if (tag === "a") {
          if (!href) { el.removeAndKeepContent(); return; }
          el.setAttribute("href", href);
          if (/^https?:/i.test(href) && !/^https?:\/\/(www\.)?cabinetabache-sadik\.com/i.test(href)) {
            el.setAttribute("target", "_blank");
            el.setAttribute("rel", "noopener");
          }
        }
        if (tag === "b") el.tagName = "strong";
        if (tag === "i") el.tagName = "em";
        if (tag === "h2") {
          current = { id: `s${toc.length + 1}`, text: "" };
          toc.push(current);
          el.setAttribute("id", current.id);
          el.onEndTag(() => { current = null; });
        }
      },
      text(t) { if (current) current.text += t.text; },
    })
    .transform(new Response(`<div>${input}</div>`, { headers: { "content-type": "text/html; charset=utf-8" } }));
  let body = (await res.text()).trim();
  // Drop empty paragraphs the editor leaves behind.
  body = body.replace(/<p>(?:\s|&nbsp;|<br>)*<\/p>/g, "").trim();
  return {
    body,
    toc: toc.map((h) => ({ id: h.id, text: decode(h.text).replace(/\s+/g, " ").trim() })).filter((h) => h.text),
  };
}

function safeHref(href) {
  if (!href) return null;
  const v = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(v) || /^\/(?!\/)/.test(v) || v.startsWith("#")) return v;
  return null;
}

function decode(s) {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
