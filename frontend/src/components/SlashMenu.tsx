import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";

export interface SlashRange {
  from: number;
  to: number;
}

export interface SlashItem {
  id: string;
  icon: string;
  label: string;
  hint?: string;
  keywords: string;
  action: string;
  emoji?: string;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: "paragraph", icon: "✍️", label: "Parágrafo", hint: "Texto simples", keywords: "text paragrafo", action: "paragraph" },
  { id: "heading1", icon: "H1", label: "Título 1", keywords: "h1 heading titulo", action: "heading1" },
  { id: "heading2", icon: "H2", label: "Título 2", keywords: "h2 heading titulo", action: "heading2" },
  { id: "heading3", icon: "H3", label: "Título 3", keywords: "h3 heading titulo", action: "heading3" },
  { id: "bulletList", icon: "•", label: "Lista com marcadores", keywords: "bullet lista", action: "bulletList" },
  { id: "orderedList", icon: "1.", label: "Lista numerada", keywords: "numbered lista", action: "orderedList" },
  { id: "quote", icon: "❝", label: "Citação", keywords: "quote citacao", action: "quote" },
  { id: "callout", icon: "💡", label: "Callout", hint: "Destaque com ícone", keywords: "destaque nota", action: "callout" },
  { id: "code", icon: "</>", label: "Código", keywords: "code codigo bloco", action: "code" },
  { id: "divider", icon: "―", label: "Divisor", keywords: "divider hr linha", action: "divider" },
  { id: "toggle", icon: "▸", label: "Toggle", hint: "Lista recolhível", keywords: "toggle detalhe", action: "toggle" },
  { id: "columns2", icon: "▤", label: "2 colunas", keywords: "colunas layout", action: "columns2" },
  { id: "columns3", icon: "▦", label: "3 colunas", keywords: "colunas layout", action: "columns3" },
  { id: "emoji", icon: "😀", label: "Emoji", keywords: "emoji", action: "emoji" },
  { id: "subpage", icon: "📄", label: "Subpágina", hint: "Cria uma página filha", keywords: "pagina subpagina child", action: "subpage" },
  { id: "table", icon: "🗃️", label: "Tabela", hint: "Banco de dados embutido", keywords: "tabela banco database", action: "table" },
  { id: "pageLink", icon: "🔗", label: "Link para página", keywords: "link pagina referencia", action: "pageLink" },
  { id: "image", icon: "🖼️", label: "Imagem", keywords: "imagem image foto", action: "image" },
  { id: "file", icon: "📎", label: "Arquivo", keywords: "arquivo anexo file", action: "file" },
];

const EMOJIS = [
  "😀", "😄", "😅", "😂", "😊", "😍", "🤔", "😎",
  "🙌", "👏", "👍", "👎", "🤝", "💪", "🙏", "👋",
  "❤️", "💙", "💚", "💛", "💜", "🖤", "⭐", "✨",
  "🔥", "🎉", "🎯", "🚀", "✅", "❌", "⚠️", "❗",
  "📌", "📝", "📚", "💡", "🔔", "🔒", "🔑", "📅",
  "📁", "🗂️", "🗃️", "🧠", "🌱", "🏆", "💰", "🕐",
];

const EMOJI_GRID: SlashItem[] = EMOJIS.map((e, i) => ({
  id: `emoji-${i}`,
  icon: e,
  label: e,
  keywords: "emoji",
  action: "emoji",
  emoji: e,
}));

interface SlashMenuProps {
  editor: Editor | null;
  onSelect: (item: SlashItem, range: SlashRange) => void;
}

export function SlashMenu({ editor, onSelect }: SlashMenuProps) {
  const [state, setState] = useState<{
    query: string;
    range: SlashRange;
    top: number;
    left: number;
  } | null>(null);
  const [active, setActive] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const { from, empty } = editor.state.selection;
      if (!empty) {
        setState(null);
        return;
      }
      const $pos = editor.state.doc.resolve(from);
      const blockStart = $pos.start($pos.depth);
      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, "\n");
      if (textBefore.startsWith("/") && from - textBefore.length === blockStart) {
        const coords = editor.view.coordsAtPos(from);
        setState({
          query: textBefore.slice(1).toLowerCase(),
          range: { from: from - textBefore.length, to: from },
          top: coords.top,
          left: coords.left,
        });
      } else {
        setState(null);
      }
    };
    editor.on("transaction", check);
    editor.on("selectionUpdate", check);
    return () => {
      editor.off("transaction", check);
      editor.off("selectionUpdate", check);
    };
  }, [editor]);

  useEffect(() => {
    setActive(0);
    setShowEmoji(false);
  }, [state?.query]);

  const items = useMemo(() => {
    if (!state) return [];
    if (showEmoji) return EMOJI_GRID;
    const q = state.query;
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.keywords.includes(q) ||
        i.id.includes(q)
    );
  }, [state, showEmoji]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActive((a) => (items.length ? (a + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActive((a) => (items.length ? (a - 1 + items.length) % items.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (items[active]) select(items[active]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (showEmoji) setShowEmoji(false);
        else cancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, items, active, showEmoji]);

  if (!state) return null;

  const current = state;

  function select(item: SlashItem) {
    if (item.action === "emoji") {
      setShowEmoji(true);
      return;
    }
    setState(null);
    onSelect(item, current.range);
  }

  function cancel() {
    const range = current.range;
    setState(null);
    editor?.chain().focus().deleteRange(range).run();
  }

  const placeAbove = current.top > 360;

  return (
    <div
      className="animate-scale-in fixed z-50 w-72 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark"
      style={{
        top: placeAbove ? current.top - 12 : current.top + 24,
        left: Math.min(current.left, window.innerWidth - 320),
        transform: placeAbove ? "translateY(-100%)" : undefined,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {showEmoji ? (
        <div className="p-2">
          <p className="px-1 pb-2 text-xs font-medium text-gray-400">Emoji</p>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_GRID.map((e) => (
              <button
                key={e.id}
                type="button"
                className="rounded p-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  setState(null);
                  onSelect(e, current.range);
                }}
              >
                {e.emoji}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">Nenhum bloco encontrado</li>
          )}
          {items.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                  idx === active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-200"
                    : "text-gray-700 dark:text-gray-200"
                }`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => select(item)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-sm dark:bg-gray-700">
                  {item.icon}
                </span>
                <span className="flex-1">
                  <span className="font-medium">{item.label}</span>
                  {item.hint && (
                    <span className="ml-2 text-xs text-gray-400">{item.hint}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
