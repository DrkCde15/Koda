import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Editor, useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { blockService, commentService, pageService } from "@/services/pages";
import { databaseService } from "@/services/databases";
import { fileService } from "@/services/files";
import { Block, Page } from "@/types";
import { useDialog } from "@/contexts/DialogContext";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import {
  DatabaseNode,
  EditorPageContext,
  FileNode,
  ImageNode,
  MentionNode,
  PageLinkNode,
  SubpageNode,
} from "@/components/editorNodes";
import {
  CalloutNode,
  ColumnNode,
  Columns2Node,
  Columns3Node,
  ToggleBodyNode,
  ToggleNode,
  ToggleSummaryNode,
} from "@/components/editorBlocks";
import { SlashMenu } from "@/components/SlashMenu";
import type { SlashItem, SlashRange } from "@/components/SlashMenu";
import { MentionList } from "@/components/MentionList";
import type { MentionRange } from "@/components/MentionList";
import type { User } from "@/types";

type JsonNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
};

function getText(node: JsonNode): string {
  if (node.type === "text") return node.text || "";
  if (node.type === "mention") return "@" + (node.attrs?.label || "");
  if (!node.content) return "";
  return node.content.map(getText).join("");
}

function listText(node: JsonNode): string {
  const items = (node.content || []).map((li) => {
    const p = (li.content || []).find((c) => c.type === "paragraph");
    return p ? getText(p) : "";
  });
  return items.join("\n");
}

function collectMentionLabels(node: JsonNode): string[] {
  const labels: string[] = [];
  if (node.type === "mention" && node.attrs?.label) labels.push(node.attrs.label as string);
  for (const child of node.content || []) labels.push(...collectMentionLabels(child));
  return labels;
}

function listNode(type: "bulletList" | "orderedList", text: string): JsonNode {
  const lines = (text || "").split("\n");
  const items = lines.map((line) => ({
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      },
    ],
  }));
  return {
    type,
    content: items.length ? items : [{ type: "listItem", content: [{ type: "paragraph" }] }],
  };
}

function blockToNode(b: Block): JsonNode {
  const c = (b.content || {}) as Record<string, unknown>;
  const text = (c.text as string) || "";
  const textContent = text ? [{ type: "text", text }] : [];
  switch (b.type) {
    case "subpage":
      return {
        type: "subpage",
        attrs: {
          pageId: (c.page_id as number) ?? null,
          title: (c.title as string) || "",
          icon: (c.icon as string) || "📄",
        },
      };
    case "database":
      return {
        type: "dbtable",
        attrs: {
          databaseId: (c.database_id as number) ?? null,
          name: (c.name as string) || "",
          icon: (c.icon as string) || "🗃️",
        },
      };
    case "file":
      return {
        type: "fileref",
        attrs: {
          fileId: (c.file_id as number) ?? null,
          name: (c.name as string) || "",
          filename: (c.filename as string) || "",
        },
      };
    case "page_link":
      return {
        type: "pagelink",
        attrs: {
          pageId: (c.page_id as number) ?? null,
          title: (c.title as string) || "",
          icon: (c.icon as string) || "📄",
        },
      };
    case "callout":
      return {
        type: "callout",
        attrs: { icon: (c.icon as string) || "💡" },
        content: [{ type: "paragraph", content: textContent }],
      };
    case "toggle": {
      const blocks = ((c.blocks as unknown[]) || []).map((b2) => blockToNode(b2 as Block));
      return {
        type: "toggle",
        content: [
          {
            type: "toggleSummary",
            content: text ? [{ type: "text", text }] : [],
          },
          {
            type: "toggleBody",
            content: blocks.length ? blocks : [{ type: "paragraph" }],
          },
        ],
      };
    }
    case "columns": {
      const cols = ((c.columns as unknown[]) || []).map((col) =>
        ((col as unknown[]) || []).map((b2) => blockToNode(b2 as Block))
      );
      const count = cols.length === 3 ? 3 : 2;
      return {
        type: count === 3 ? "columns3" : "columns2",
        content: cols.map((col) => ({
          type: "column",
          content: col.length ? col : [{ type: "paragraph" }],
        })),
      };
    }
    case "paragraph":
      return { type: "paragraph", content: textContent };
    case "heading_1":
      return { type: "heading", attrs: { level: 1 }, content: textContent };
    case "heading_2":
      return { type: "heading", attrs: { level: 2 }, content: textContent };
    case "heading_3":
      return { type: "heading", attrs: { level: 3 }, content: textContent };
    case "bullet_list":
      return listNode("bulletList", text);
    case "numbered_list":
      return listNode("orderedList", text);
    case "quote":
      return { type: "blockquote", content: [{ type: "paragraph", content: textContent }] };
    case "code":
      return { type: "codeBlock", content: text ? [{ type: "text", text }] : [] };
    case "divider":
      return { type: "horizontalRule" };
    case "image":
      return {
        type: "image",
        attrs: {
          fileId: (c.file_id as number) ?? null,
          name: (c.name as string) || "",
          filename: (c.filename as string) || "",
        },
      };
    default:
      return { type: "paragraph", content: textContent };
  }
}

function nodeToBlock(node: JsonNode): { type: string; content: Record<string, unknown> } {
  const attrs = node.attrs || {};
  switch (node.type) {
    case "subpage":
      return {
        type: "subpage",
        content: {
          page_id: attrs.pageId ?? null,
          title: attrs.title ?? "",
          icon: attrs.icon ?? "📄",
        },
      };
    case "dbtable":
      return {
        type: "database",
        content: {
          database_id: attrs.databaseId ?? null,
          name: attrs.name ?? "",
          icon: attrs.icon ?? "🗃️",
        },
      };
    case "fileref":
      return {
        type: "file",
        content: {
          file_id: attrs.fileId ?? null,
          name: attrs.name ?? "",
          filename: attrs.filename ?? "",
        },
      };
    case "pagelink":
      return {
        type: "page_link",
        content: {
          page_id: attrs.pageId ?? null,
          title: attrs.title ?? "",
          icon: attrs.icon ?? "📄",
        },
      };
    case "callout":
      return {
        type: "callout",
        content: { text: getText(node), icon: attrs.icon ?? "💡" },
      };
    case "toggle": {
      const summary = (node.content || [])[0];
      const body = (node.content || [])[1];
      return {
        type: "toggle",
        content: {
          text: getText(summary || ({} as JsonNode)),
          blocks: ((body as JsonNode)?.content || []).map(nodeToBlock),
        },
      };
    }
    case "columns2":
    case "columns3":
      return {
        type: "columns",
        content: {
          columns: (node.content || []).map((col) =>
            ((col as JsonNode).content || []).map(nodeToBlock)
          ),
        },
      };
    case "image":
      return {
        type: "image",
        content: {
          file_id: attrs.fileId ?? null,
          name: attrs.name ?? "",
          filename: attrs.filename ?? "",
        },
      };
    case "heading":
      return {
        type: `heading_${((node.attrs?.level as number) || 1)}`,
        content: { text: getText(node) },
      };
    case "bulletList":
      return { type: "bullet_list", content: { text: listText(node) } };
    case "orderedList":
      return { type: "numbered_list", content: { text: listText(node) } };
    case "blockquote":
      return { type: "quote", content: { text: getText(node) } };
    case "codeBlock":
      return { type: "code", content: { text: getText(node) } };
    case "horizontalRule":
      return { type: "divider", content: {} };
    default:
      return { type: "paragraph", content: { text: getText(node) } };
  }
}

function debounce(fn: () => void, ms: number): { call: () => void; cancel: () => void } {
  let t: ReturnType<typeof setTimeout>;
  return {
    call: () => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    },
    cancel: () => clearTimeout(t),
  };
}

export function BlockEditor({
  pageId,
  workspaceId,
  initialBlocks,
}: {
  pageId: number;
  workspaceId: number;
  initialBlocks: Block[];
}) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRangeRef = useRef<SlashRange | null>(null);
  const uploadImageRef = useRef<(file: File) => void>(() => {});
  const applyingInitial = useRef(false);
  const isMounted = useRef(true);
  const blocksRef = useRef<Block[]>(initialBlocks);
  blocksRef.current = initialBlocks;
  const editorRef = useRef<Editor | null>(null);
  const notifiedMentions = useRef<Set<string>>(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSync = useMemo(
    () =>
      debounce(() => {
        if (!isMounted.current) return;
        const editor = editorRef.current;
        if (!editor) return;
        const nodes = (editor.getJSON() as JsonNode).content || [];
        const next = nodes.map(nodeToBlock);
        const current = blocksRef.current;
        const max = Math.max(current.length, next.length);
        (async () => {
          if (!isMounted.current) return;
          for (let i = 0; i < max; i++) {
            if (!isMounted.current) return;
            const cur = current[i];
            const nxt = next[i];
            if (cur && nxt) {
              const changed =
                cur.type !== nxt.type ||
                JSON.stringify(cur.content) !== JSON.stringify(nxt.content) ||
                cur.position !== i;
              if (changed) {
                await blockService.update(cur.id, {
                  type: nxt.type,
                  content: nxt.content,
                  position: i,
                });
              }
            } else if (nxt && !cur) {
              await blockService.create({
                page_id: pageId,
                type: nxt.type,
                content: nxt.content,
                position: i,
              });
            } else if (cur && !nxt) {
              await blockService.remove(cur.id);
            }
          }
          if (isMounted.current) {
            queryClient.invalidateQueries({ queryKey: ["blocks", pageId] });
          }
        })();
      }, 600),
    [pageId, queryClient],
  );

  // Cancel pending sync and mark unmounted when the component is destroyed
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      debouncedSync.cancel();
    };
  }, [debouncedSync]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      SubpageNode,
      DatabaseNode,
      FileNode,
      ImageNode,
      PageLinkNode,
      MentionNode,
      CalloutNode,
      ToggleSummaryNode,
      ToggleBodyNode,
      ToggleNode,
      ColumnNode,
      Columns2Node,
      Columns3Node,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "koda-editor prose dark:prose-invert focus:outline-none",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (image) {
          event.preventDefault();
          uploadImageRef.current(image);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (applyingInitial.current) return;
      debouncedSync.call();
      const labels = collectMentionLabels(ed.getJSON() as JsonNode);
      const fresh = labels.filter((label) => !notifiedMentions.current.has(label));
      if (fresh.length) {
        fresh.forEach((label) => notifiedMentions.current.add(label));
        commentService.notifyMentions(pageId, fresh).catch(() => {
          fresh.forEach((label) => notifiedMentions.current.delete(label));
        });
      }
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    applyingInitial.current = true;
    const doc = {
      type: "doc",
      content: initialBlocks.map(blockToNode),
    };
    editor.commands.setContent(doc, false);
    // Reset asynchronously: setContent fires onUpdate synchronously,
    // so we must delay the reset to the next microtask to keep it suppressed.
    Promise.resolve().then(() => {
      applyingInitial.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function appendBlock(node: Record<string, unknown>) {
    if (!editor) return;
    const doc = editor.state.doc;
    const last = doc.lastChild;
    const hasTrailingParagraph =
      !!last && last.type.name === "paragraph" && last.content.size === 0;
    if (hasTrailingParagraph) {
      const pos = doc.content.size - last!.nodeSize;
      editor.chain().focus().insertContentAt(pos, node).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt(doc.content.size, [node, { type: "paragraph" }])
        .run();
    }
  }

  /** Insert a node at the slash-menu range (replacing the "/query") or append at the end. */
  function insertNodeAt(node: JsonNode | string | Array<JsonNode | string>, range?: SlashRange) {
    if (!editor) return;
    if (range) {
      editor.chain().focus().deleteRange(range).insertContent(node as JsonNode).run();
    } else {
      appendBlock(node as Record<string, unknown>);
    }
  }

  function columnsNode(count: 2 | 3): JsonNode {
    const type = count === 3 ? "columns3" : "columns2";
    return {
      type,
      content: Array.from({ length: count }, () => ({
        type: "column",
        content: [{ type: "paragraph" }],
      })),
    };
  }

  function toggleNode(): JsonNode {
    return {
      type: "toggle",
      content: [
        { type: "toggleSummary", content: [] },
        { type: "toggleBody", content: [{ type: "paragraph" }] },
      ],
    };
  }

  function handleSlashSelect(item: SlashItem, range: SlashRange) {
    switch (item.action) {
      case "paragraph":
        insertNodeAt({ type: "paragraph" }, range);
        break;
      case "heading1":
        insertNodeAt({ type: "heading", attrs: { level: 1 }, content: [] }, range);
        break;
      case "heading2":
        insertNodeAt({ type: "heading", attrs: { level: 2 }, content: [] }, range);
        break;
      case "heading3":
        insertNodeAt({ type: "heading", attrs: { level: 3 }, content: [] }, range);
        break;
      case "bulletList":
        insertNodeAt(
          {
            type: "bulletList",
            content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
          },
          range
        );
        break;
      case "orderedList":
        insertNodeAt(
          {
            type: "orderedList",
            content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
          },
          range
        );
        break;
      case "quote":
        insertNodeAt(
          { type: "blockquote", content: [{ type: "paragraph" }] },
          range
        );
        break;
      case "callout":
        insertNodeAt(
          {
            type: "callout",
            attrs: { icon: item.emoji || "💡" },
            content: [{ type: "paragraph" }],
          },
          range
        );
        break;
      case "code":
        insertNodeAt({ type: "codeBlock" }, range);
        break;
      case "divider":
        insertNodeAt({ type: "horizontalRule" }, range);
        break;
      case "toggle":
        insertNodeAt(toggleNode(), range);
        break;
      case "columns2":
        insertNodeAt(columnsNode(2), range);
        break;
      case "columns3":
        insertNodeAt(columnsNode(3), range);
        break;
      case "emoji":
        insertNodeAt(item.emoji || "😀", range);
        break;
      case "subpage":
        insertSubpage(range);
        break;
      case "table":
        insertTable(range);
        break;
      case "pageLink":
        insertPageLink(range);
        break;
      case "image":
      case "file":
        imageRangeRef.current = range;
        fileInputRef.current?.click();
        break;
    }
  }

  async function insertSubpage(range?: SlashRange) {
    const result = await dialog.prompt({
      title: "Nova subpágina",
      confirmLabel: "Criar",
      fields: [
        { name: "title", label: "Nome da subpágina", defaultValue: "Sem título", required: true },
        { name: "icon", label: "Ícone (emoji)", defaultValue: "📄" },
      ],
    });
    if (!result) return;
    try {
      const page = await pageService.create(workspaceId, {
        title: result.title.trim() || "Sem título",
        icon: result.icon || undefined,
        parent_id: pageId,
      });
      insertNodeAt(
        {
          type: "subpage",
          attrs: { pageId: page.id, title: page.title, icon: page.icon || "📄" },
        },
        range
      );
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }

  async function insertPageLink(range: SlashRange) {
    let pages: Page[] = [];
    try {
      pages = await pageService.list(workspaceId, undefined, true);
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
      return;
    }
    if (pages.length === 0) {
      toast.push("Crie uma página antes de inserir um link", "info");
      return;
    }
    const result = await dialog.prompt({
      title: "Link para página",
      confirmLabel: "Inserir",
      fields: [
        {
          name: "page",
          label: "Página",
          type: "select",
          required: true,
          defaultValue: String(pages[0].id),
          options: pages.map((p) => ({
            label: `${p.icon || "📄"} ${p.title}`,
            value: String(p.id),
          })),
        },
      ],
    });
    if (!result?.page) return;
    const target = pages.find((p) => String(p.id) === result.page);
    if (!target) return;
    insertNodeAt(
      {
        type: "pagelink",
        attrs: { pageId: target.id, title: target.title, icon: target.icon || "📄" },
      },
      range
    );
  }

  async function insertTable(range?: SlashRange) {
    let databases = [];
    try {
      databases = await databaseService.list(workspaceId);
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
      return;
    }
    const NEW = "__new__";
    const result = await dialog.prompt({
      title: "Inserir tabela",
      confirmLabel: "Inserir",
      fields: [
        {
          name: "db",
          label: "Tabela",
          type: "select",
          required: true,
          defaultValue: databases[0] ? String(databases[0].id) : NEW,
          options: [
            ...databases.map((d) => ({ label: `${d.icon || "🗃️"} ${d.name}`, value: String(d.id) })),
            { label: "➕ Nova tabela…", value: NEW },
          ],
        },
      ],
    });
    if (!result?.db) return;
    try {
      let db;
      if (result.db === NEW) {
        const nameRes = await dialog.prompt({
          title: "Nova tabela",
          confirmLabel: "Criar",
          fields: [{ name: "name", label: "Nome da tabela", defaultValue: "Nova tabela", required: true }],
        });
        if (!nameRes?.name) return;
        db = await databaseService.create({
          workspace_id: workspaceId,
          name: nameRes.name,
          icon: "🗃️",
        });
      } else {
        db = databases.find((d) => String(d.id) === result.db);
      }
      if (!db) return;
      insertNodeAt(
        {
          type: "dbtable",
          attrs: { databaseId: db.id, name: db.name, icon: db.icon || "🗃️" },
        },
        range
      );
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }

  async function insertImage(file: File, range?: SlashRange) {
    if (!file.type.startsWith("image/")) {
      toast.push("O arquivo selecionado não é uma imagem", "error");
      return;
    }
    try {
      const uploaded = await fileService.upload(workspaceId, file);
      insertNodeAt(
        {
          type: "image",
          attrs: {
            fileId: uploaded.id,
            name: uploaded.original_name,
            filename: uploaded.filename,
          },
        },
        range
      );
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }
  uploadImageRef.current = insertImage;

  async function handleFilePicked(file: File, range?: SlashRange) {
    if (file.type.startsWith("image/")) {
      insertImage(file, range);
      return;
    }
    try {
      const uploaded = await fileService.upload(workspaceId, file);
      insertNodeAt(
        {
          type: "fileref",
          attrs: {
            fileId: uploaded.id,
            name: uploaded.original_name,
            filename: uploaded.filename,
          },
        },
        range
      );
      toast.push("Arquivo anexado", "success");
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }

  function insertMention(member: User, range: MentionRange) {
    editorRef.current
      ?.chain()
      .focus()
      .deleteRange(range)
      .insertContent({ type: "mention", attrs: { id: member.id, label: member.full_name } })
      .run();
  }

  return (
    <EditorPageContext.Provider value={{ workspaceId, pageId }}>
      <div className="sticky top-5 z-20 mb-6 flex w-full flex-wrap items-center gap-1 rounded-2xl border border-[var(--koda-border)] bg-[var(--koda-surface)]/80 p-1.5 shadow-soft backdrop-blur-xl">
        <ToolbarButton label="B" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} />
        <ToolbarButton label="I" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} />
        <ToolbarButton label="H1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} />
        <ToolbarButton label="H2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} />
        <ToolbarButton label="H3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} />
        <span className="mx-1 h-5 w-px self-center bg-[var(--koda-border)]" />
        <ToolbarButton label="• Lista" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} />
        <ToolbarButton label="1. Lista" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} />
        <ToolbarButton label="❝" title="Citação" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} />
        <ToolbarButton label="</>" title="Bloco de código" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} />
        <ToolbarButton label="―" title="Divisor" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
        <span className="mx-1 h-5 w-px self-center bg-[var(--koda-border)]" />
        <ToolbarButton label="📄" title="Subpágina" onClick={insertSubpage} />
        <ToolbarButton label="🗃️" title="Inserir tabela" onClick={insertTable} />
        <ToolbarButton label="📎" title="Arquivo/Imagem" onClick={() => fileInputRef.current?.click()} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const range = imageRangeRef.current;
          imageRangeRef.current = null;
          if (f) handleFilePicked(f, range ?? undefined);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
      <SlashMenu editor={editor} onSelect={handleSlashSelect} />
      <MentionList editor={editor} workspaceId={workspaceId} onSelect={insertMention} />
    </EditorPageContext.Provider>
  );
}

function ToolbarButton({
  label,
  onClick,
  active,
  title,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={`min-w-8 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
        active
          ? "bg-brand-gradient text-white shadow-glow-brand"
          : "text-[var(--koda-text-muted)] hover:bg-[var(--koda-surface-2)] hover:text-[var(--koda-text)]"
      }`}
    >
      {label}
    </button>
  );
}
