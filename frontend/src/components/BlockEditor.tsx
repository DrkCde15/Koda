import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Editor, useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { blockService, pageService } from "@/services/pages";
import { databaseService } from "@/services/databases";
import { fileService } from "@/services/files";
import { Block } from "@/types";
import { useDialog } from "@/contexts/DialogContext";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/error";
import {
  DatabaseNode,
  EditorPageContext,
  FileNode,
  ImageNode,
  SubpageNode,
} from "@/components/editorNodes";

type JsonNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
};

function getText(node: JsonNode): string {
  if (node.type === "text") return node.text || "";
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
    case "callout":
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

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
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
  const uploadImageRef = useRef<(file: File) => void>(() => {});
  const applyingInitial = useRef(false);
  const blocksRef = useRef<Block[]>(initialBlocks);
  blocksRef.current = initialBlocks;
  const editorRef = useRef<Editor | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sync = useCallback(
    debounce(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const nodes = (editor.getJSON() as JsonNode).content || [];
      const next = nodes.map(nodeToBlock);
      const current = blocksRef.current;
      const max = Math.max(current.length, next.length);
      (async () => {
        for (let i = 0; i < max; i++) {
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
        queryClient.invalidateQueries({ queryKey: ["blocks", pageId] });
      })();
    }, 600),
    [pageId, queryClient],
  );

  const editor = useEditor({
    extensions: [StarterKit, SubpageNode, DatabaseNode, FileNode, ImageNode],
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
    onUpdate: () => {
      if (applyingInitial.current) return;
      sync();
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor || applyingInitial.current) return;
    applyingInitial.current = true;
    const doc = {
      type: "doc",
      content: initialBlocks.map(blockToNode),
    };
    editor.commands.setContent(doc, false);
    applyingInitial.current = false;
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

  async function insertSubpage() {
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
      appendBlock({
        type: "subpage",
        attrs: { pageId: page.id, title: page.title, icon: page.icon || "📄" },
      });
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }

  async function insertTable() {
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
      appendBlock({
        type: "dbtable",
        attrs: { databaseId: db.id, name: db.name, icon: db.icon || "🗃️" },
      });
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }

  async function insertImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.push("O arquivo selecionado não é uma imagem", "error");
      return;
    }
    try {
      const uploaded = await fileService.upload(workspaceId, file);
      appendBlock({
        type: "image",
        attrs: {
          fileId: uploaded.id,
          name: uploaded.original_name,
          filename: uploaded.filename,
        },
      });
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }
  uploadImageRef.current = insertImage;

  async function handleFilePicked(file: File) {
    if (file.type.startsWith("image/")) {
      insertImage(file);
      return;
    }
    try {
      const uploaded = await fileService.upload(workspaceId, file);
      appendBlock({
        type: "fileref",
        attrs: {
          fileId: uploaded.id,
          name: uploaded.original_name,
          filename: uploaded.filename,
        },
      });
      toast.push("Arquivo anexado", "success");
    } catch (err) {
      toast.push(getErrorMessage(err), "error");
    }
  }

  return (
    <EditorPageContext.Provider value={{ workspaceId, pageId }}>
      <div className="mb-2 flex flex-wrap gap-1 border-b border-gray-200 pb-2 dark:border-gray-700">
        <ToolbarButton label="B" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} />
        <ToolbarButton label="I" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} />
        <ToolbarButton label="H1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} />
        <ToolbarButton label="H2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} />
        <ToolbarButton label="H3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} />
        <ToolbarButton label="• Lista" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} />
        <ToolbarButton label="1. Lista" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} />
        <ToolbarButton label="❝ Citação" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} />
        <ToolbarButton label="</> Código" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} />
        <ToolbarButton label="― Divisor" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
        <span className="mx-1 w-px self-stretch bg-gray-200 dark:bg-gray-700" />
        <ToolbarButton label="📄 Subpágina" onClick={insertSubpage} />
        <ToolbarButton label="🗃️ Tabela" onClick={insertTable} />
        <ToolbarButton label="📎 Arquivo/Imagem" onClick={() => fileInputRef.current?.click()} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFilePicked(f);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </EditorPageContext.Provider>
  );
}

function ToolbarButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm ${
        active
          ? "bg-brand-600 text-white"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );
}
