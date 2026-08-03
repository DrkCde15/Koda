import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  NodeViewProps,
} from "@tiptap/react";

import { fileService } from "@/services/files";

interface EditorPageCtx {
  workspaceId: number;
  pageId: number;
}

export const EditorPageContext = createContext<EditorPageCtx>({
  workspaceId: 0,
  pageId: 0,
});

const cardClass =
  "koda-node-card";

function SubpageView({ node }: NodeViewProps) {
  const navigate = useNavigate();
  const pageId = node.attrs.pageId as number | null;
  const title = (node.attrs.title as string) || "Sem título";
  const icon = (node.attrs.icon as string) || "📄";
  return (
    <NodeViewWrapper>
      <button
        type="button"
        className={cardClass + " w-full"}
        contentEditable={false}
        onClick={() => {
          if (pageId) navigate(`/pages/${pageId}`);
        }}
      >
        <span>{icon}</span>
        <span className="font-medium text-[var(--koda-text)]">{title}</span>
        <span className="ml-auto text-xs text-gray-400">abrir →</span>
      </button>
    </NodeViewWrapper>
  );
}

function DatabaseView({ node }: NodeViewProps) {
  const navigate = useNavigate();
  const { workspaceId } = useContext(EditorPageContext);
  const databaseId = node.attrs.databaseId as number | null;
  const name = (node.attrs.name as string) || "Tabela";
  const icon = (node.attrs.icon as string) || "🗃️";
  return (
    <NodeViewWrapper>
      <button
        type="button"
        className={cardClass + " w-full"}
        contentEditable={false}
        onClick={() =>
          databaseId &&
          navigate(`/workspaces/${workspaceId}/databases/${databaseId}`)
        }
      >
        <span>{icon}</span>
        <span className="font-medium">{name}</span>
        <span className="ml-auto text-xs text-gray-400">abrir →</span>
      </button>
    </NodeViewWrapper>
  );
}

function FileView({ node }: NodeViewProps) {
  const { workspaceId } = useContext(EditorPageContext);
  const fileId = node.attrs.fileId as number | null;
  const filename = (node.attrs.filename as string) || "";
  const name = (node.attrs.name as string) || filename || "Arquivo";
  return (
    <NodeViewWrapper>
      <button
        type="button"
        className={cardClass + " w-full"}
        contentEditable={false}
        onClick={() => {
          if (fileId && filename) fileService.download(workspaceId, filename, name);
        }}
      >
        <span>📎</span>
        <span className="font-medium">{name}</span>
        <span className="ml-auto text-xs text-[var(--koda-text-faint)]">baixar ↓</span>
      </button>
    </NodeViewWrapper>
  );
}

function ImageView({ node }: NodeViewProps) {
  const { workspaceId } = useContext(EditorPageContext);
  const filename = (node.attrs.filename as string) || "";
  const name = (node.attrs.name as string) || filename || "imagem";
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (!filename) return;
    fileService
      .objectUrl(workspaceId, filename)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setSrc(u);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [workspaceId, filename]);

  return (
    <NodeViewWrapper>
      <div contentEditable={false} className="my-2">
        {failed ? (
          <div className={cardClass}>Falha ao carregar a imagem</div>
        ) : src ? (
          <img
            src={src}
            alt={name}
            className="max-w-full rounded-2xl border border-[var(--koda-border)] shadow-soft"
          />
        ) : (
          <div className="skeleton h-24 w-full" />
        )}
      </div>
    </NodeViewWrapper>
  );
}

function PageLinkView({ node }: NodeViewProps) {
  const navigate = useNavigate();
  const pageId = node.attrs.pageId as number | null;
  const title = (node.attrs.title as string) || "Página";
  const icon = (node.attrs.icon as string) || "📄";
  return (
    <NodeViewWrapper>
      <button
        type="button"
        contentEditable={false}
        className="my-1 inline-flex items-center gap-1.5 rounded-lg border border-[var(--koda-border)] bg-[var(--koda-surface)] px-2.5 py-1 text-sm font-medium text-brand-600 transition-all duration-150 hover:-translate-y-px hover:shadow-soft dark:text-brand-300"
        onClick={() => {
          if (pageId) navigate(`/pages/${pageId}`);
        }}
      >
        <span>{icon}</span>
        <span className="font-medium underline decoration-dotted underline-offset-2">
          {title}
        </span>
        <span className="text-xs text-[var(--koda-text-faint)]">↗</span>
      </button>
    </NodeViewWrapper>
  );
}

export const PageLinkNode = Node.create({
  name: "pagelink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "" },
      icon: { default: "📄" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-pagelink]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-pagelink": "" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView);
  },
});

export const ImageNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      fileId: { default: null },
      name: { default: "" },
      filename: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-koda-image]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-koda-image": "" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

export const SubpageNode = Node.create({
  name: "subpage",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "" },
      icon: { default: "📄" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-subpage]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-subpage": "" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SubpageView);
  },
});

export const DatabaseNode = Node.create({
  name: "dbtable",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      databaseId: { default: null },
      name: { default: "" },
      icon: { default: "🗃️" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-dbtable]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-dbtable": "" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DatabaseView);
  },
});

export const FileNode = Node.create({
  name: "fileref",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      fileId: { default: null },
      name: { default: "" },
      filename: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-fileref]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-fileref": "" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FileView);
  },
});

export const MentionNode = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      id: { default: null },
      label: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-mention": "" }, HTMLAttributes),
      `@${node.attrs.label}`,
    ];
  },
  renderText({ node }) {
    return `@${node.attrs.label}`;
  },
});
