import sanitizeHtml from "sanitize-html";
import type { ActivityPostInput } from "./types";

type ValidationResult = { ok: true; data: ActivityPostInput } | { ok: false; error: string };
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
function isValidImage(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

// Chỉ cho phép HTML trình soạn thảo cần dùng; chặn script, iframe, handler và URL nguy hiểm.
export function cleanActivityHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "span", "mark"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      p: ["style"], h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
      span: ["style"], mark: ["style"], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
    },
    allowedStyles: {
      '*': { 'text-align': [/^(left|right|center|justify)$/], 'color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([\d\s,.%]+\)$/], 'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([\d\s,.%]+\)$/], 'font-family': [/^[a-zA-Z0-9 ,'-]{1,60}$/], 'font-size': [/^(?:1[0-9]|2[0-9]|3[0-2])px$/] },
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({ tagName: "a", attribs: { ...attrs, rel: "noopener noreferrer", target: "_blank" } }),
    },
    // Ảnh nội bộ /uploads/... được phép; URL khác chỉ HTTPS.
    exclusiveFilter: (frame) => frame.tag === "img" && !(typeof frame.attribs.src === "string" && isValidImage(frame.attribs.src)),
  });
}

export function parseActivityPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) return { ok: false, error: "Dữ liệu bài viết không hợp lệ." };
  const slug = typeof input.slug === "string" ? input.slug.trim().toLowerCase() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const excerpt = typeof input.excerpt === "string" ? input.excerpt.trim() : "";
  const { category } = input;
  const status = input.status ?? "draft";
  const featured = input.featured ?? false;
  const sortOrder = input.sortOrder ?? 0;
  const image = input.image === null || input.image === undefined || input.image === "" ? null : input.image;
  if (!SLUG_PATTERN.test(slug) || slug.length > 160) return { ok: false, error: "Slug không hợp lệ (tối đa 160 ký tự)." };
  if (!title || title.length > 200) return { ok: false, error: "Tiêu đề phải có từ 1 đến 200 ký tự." };
  if (excerpt.length > 600) return { ok: false, error: "Mô tả ngắn không được vượt quá 600 ký tự." };
  if (category !== "learning" && category !== "sharing") return { ok: false, error: "Danh mục không hợp lệ." };
  if (status !== "draft" && status !== "published") return { ok: false, error: "Trạng thái không hợp lệ." };
  if (typeof featured !== "boolean") return { ok: false, error: "Trường nổi bật không hợp lệ." };
  if (typeof sortOrder !== "number" || !Number.isSafeInteger(sortOrder) || sortOrder < 0) return { ok: false, error: "Thứ tự phải là số nguyên không âm." };
  if (image !== null && (typeof image !== "string" || image.length > 2048 || !isValidImage(image))) return { ok: false, error: "Ảnh phải là URL HTTPS hoặc đường dẫn nội bộ." };
  if (!Array.isArray(input.content) || input.content.length > 100) return { ok: false, error: "Nội dung cũ phải là danh sách tối đa 100 phần." };
  const content: ActivityPostInput["content"] = [];
  for (const block of input.content) {
    if (!isRecord(block) || typeof block.heading !== "string" || typeof block.text !== "string") return { ok: false, error: "Mỗi phần phải có heading và text." };
    const heading = block.heading.trim(), text = block.text.trim();
    if (heading.length > 200 || text.length > 20000) return { ok: false, error: "Phần nội dung quá dài." };
    if (text) content.push({ heading, text });
  }
  if (input.contentHtml !== undefined && typeof input.contentHtml !== "string") return { ok: false, error: "HTML không hợp lệ." };
  if (typeof input.contentHtml === "string" && input.contentHtml.length > 200000) return { ok: false, error: "HTML vượt quá 200.000 ký tự." };
  const contentHtml = cleanActivityHtml(typeof input.contentHtml === "string" ? input.contentHtml : "");
  const plainText = sanitizeHtml(contentHtml, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
  if (status === "published" && (!excerpt || (!plainText && content.length === 0))) return { ok: false, error: "Bài xuất bản cần mô tả và nội dung." };
  return { ok: true, data: { slug, title, excerpt, category, image, content, contentHtml, status, featured, sortOrder } };
}
