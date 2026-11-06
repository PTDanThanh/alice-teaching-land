"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import { Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, ImagePlus, Table2, Quote, Code, Undo2, Redo2, CodeXml, Eraser, Minus } from "lucide-react";

type Props = { value: string; onChange: (html: string) => void };

export default function ActivityEditor({ value, onChange }: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [source, setSource] = useState(value);
  const [, redraw] = useState(0);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        className: "",
        class: "min-h-[350px] p-4 text-sm leading-7 outline-none [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-white",
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    onSelectionUpdate: () => redraw((v) => v + 1),
    onTransaction: () => redraw((v) => v + 1),
  });

  // Khi chọn một bài khác trong modal, cập nhật nội dung editor mà không tạo vòng lặp.
  useEffect(() => {
    if (!editor || htmlMode) return;
    if (editor.getHTML() !== (value || "<p></p>")) editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [editor, value, htmlMode]);

  if (!editor) return <div className="rounded-xl border p-4 text-sm text-slate-500">Đang tải trình soạn thảo...</div>;

  const buttonClass = (active = false) => `rounded-lg border px-2 py-1.5 transition ${active ? "border-violet-600 bg-violet-100 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`;
  const tools = [
    { title: "In đậm", icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { title: "In nghiêng", icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { title: "Gạch chân", icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline") },
    { title: "Gạch ngang", icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
    { title: "Tiêu đề H1", icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
    { title: "Tiêu đề H2", icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { title: "Tiêu đề H3", icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { title: "Căn trái", icon: AlignLeft, action: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }) },
    { title: "Căn giữa", icon: AlignCenter, action: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }) },
    { title: "Căn phải", icon: AlignRight, action: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }) },
    { title: "Danh sách dấu chấm", icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { title: "Danh sách đánh số", icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { title: "Trích dẫn", icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
    { title: "Khối code", icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
    { title: "Chèn bảng 3×3", icon: Table2, action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), active: editor.isActive("table") },
    { title: "Đường kẻ", icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false },
    { title: "Hoàn tác", icon: Undo2, action: () => editor.chain().focus().undo().run(), active: false },
    { title: "Làm lại", icon: Redo2, action: () => editor.chain().focus().redo().run(), active: false },
    { title: "Xóa định dạng", icon: Eraser, action: () => editor.chain().focus().unsetAllMarks().clearNodes().run(), active: false },
  ];

  function insertLink() {
    if (!editor) return;
    const url = window.prompt("Nhập liên kết HTTPS:", editor.getAttributes("link").href || "https://");
    if (url === null) return;
    if (!url.trim()) { editor.chain().focus().unsetLink().run(); return; }
    if (!/^https:\/\//i.test(url)) { window.alert("Chỉ hỗ trợ liên kết HTTPS."); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }
  function insertImage() {
    if (!editor) return;
    const url = window.prompt("URL ảnh HTTPS hoặc /uploads/...");
    if (!url) return;
    if (!(url.startsWith("/") && !url.startsWith("//")) && !/^https:\/\//i.test(url)) { window.alert("URL ảnh không hợp lệ."); return; }
    editor.chain().focus().setImage({ src: url }).run();
  }
  function toggleSource() {
    if (!editor) return;
    if (htmlMode) { editor.commands.setContent(source); onChange(editor.getHTML()); setHtmlMode(false); }
    else { setSource(editor.getHTML()); setHtmlMode(true); }
  }

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 p-2">
      <select aria-label="Phông chữ" disabled={htmlMode} className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs" onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} defaultValue="Arial">
        <option value="Arial">Arial</option><option value="Inter">Inter</option><option value="Georgia">Georgia</option><option value="monospace">Monospace</option>
      </select>
      <label className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">Màu chữ <input type="color" aria-label="Màu chữ" disabled={htmlMode} onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} /></label>
      <label className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">Tô nền <input type="color" aria-label="Màu nền" disabled={htmlMode} defaultValue="#ffff00" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} /></label>
      {tools.map(({ title, icon: Icon, action, active }) => <button key={title} type="button" title={title} aria-label={title} disabled={htmlMode} onClick={action} className={buttonClass(active)}><Icon className="h-4 w-4" /></button>)}
      <button type="button" disabled={htmlMode} onClick={insertLink} className={buttonClass(editor.isActive("link"))} title="Chèn liên kết"><Link2 className="h-4 w-4" /></button>
      <button type="button" disabled={htmlMode} onClick={insertImage} className={buttonClass()} title="Chèn ảnh"><ImagePlus className="h-4 w-4" /></button>
      {editor.isActive("table") && !htmlMode && <div className="flex flex-wrap gap-1 border-l pl-2">
        <button type="button" className={buttonClass()} onClick={() => editor.chain().focus().addRowAfter().run()}>+ Hàng</button>
        <button type="button" className={buttonClass()} onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Cột</button>
        <button type="button" className={buttonClass()} onClick={() => editor.chain().focus().deleteRow().run()}>Xóa hàng</button>
        <button type="button" className={buttonClass()} onClick={() => editor.chain().focus().deleteColumn().run()}>Xóa cột</button>
        <button type="button" className={buttonClass()} onClick={() => editor.chain().focus().deleteTable().run()}>Xóa bảng</button>
      </div>}
      <button type="button" onClick={toggleSource} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"><CodeXml className="h-4 w-4" />{htmlMode ? "Soạn thảo" : "HTML"}</button>
    </div>
    {htmlMode ? <textarea aria-label="Mã HTML bài viết" value={source} onChange={(e) => { setSource(e.target.value); onChange(e.target.value); }} className="min-h-[350px] w-full resize-y bg-slate-900 p-4 font-mono text-sm text-emerald-300 outline-none" /> : <EditorContent editor={editor} />}
  </div>;
}
