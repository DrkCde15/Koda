import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Editor, useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { blockService } from "@/services/pages";
import { Block } from "@/types";

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
  const text = ((b.content as { text?: string } | null)?.text as string) || "";
  const textContent = text ? [{ type: "text", text }] : [];
  switch (b.type) {
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
      return { type: "paragraph", content: textContent };
    default:
      return { type: "paragraph", content: textContent };
  }
}

function nodeToBlock(node: JsonNode): { type: string; content: Record<string, unknown> } {
  switch (node.type) {
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

export function BlockEditor({ pageId, initialBlocks }: { pageId: number; initialBlocks: Block[] }) {
  const queryClient = useQueryClient();
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
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "koda-editor prose dark:prose-invert focus:outline-none",
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

  return (
    <div>
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
      </div>
      <EditorContent editor={editor} />
    </div>
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
