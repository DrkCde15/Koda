import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";

import { workspaceService } from "@/services/auth";
import type { User } from "@/types";

export interface MentionRange {
  from: number;
  to: number;
}

interface MentionListProps {
  editor: Editor | null;
  workspaceId: number;
  onSelect: (member: User, range: MentionRange) => void;
}

export function MentionList({ editor, workspaceId, onSelect }: MentionListProps) {
  const [state, setState] = useState<{
    query: string;
    range: MentionRange;
    top: number;
    left: number;
  } | null>(null);
  const [active, setActive] = useState(0);
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    workspaceService
      .listMembers(workspaceId)
      .then((list) => {
        if (!cancelled) setMembers(list.map((m) => m.user).filter((u): u is User => !!u));
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const { from, empty } = editor.state.selection;
      if (!empty) {
        setState(null);
        return;
      }
      const $pos = editor.state.doc.resolve(from);
      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, "\n");
      const match = /(?:^|\s)@([^\s]*)$/.exec(textBefore);
      if (match) {
        const coords = editor.view.coordsAtPos(from);
        setState({
          query: match[1].toLowerCase(),
          range: { from: from - match[1].length - 1, to: from },
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

  const items = useMemo(() => {
    if (!state) return [];
    const q = state.query;
    return members.filter((m) => m.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [state, members]);

  useEffect(() => {
    setActive(0);
  }, [state?.query]);

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
        cancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, items, active]);

  if (!state) return null;

  const current = state;

  function select(member: User) {
    setState(null);
    onSelect(member, current.range);
  }

  function cancel() {
    const range = current.range;
    setState(null);
    editor?.chain().focus().deleteRange(range).run();
  }

  const placeAbove = current.top > 360;

  return (
    <div
      className="animate-scale-in fixed z-50 w-64 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-surface-dark"
      style={{
        top: placeAbove ? current.top - 12 : current.top + 24,
        left: Math.min(current.left, window.innerWidth - 280),
        transform: placeAbove ? "translateY(-100%)" : undefined,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ul className="max-h-72 overflow-y-auto py-1">
        {items.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-400">Nenhum membro encontrado</li>
        )}
        {items.map((member, idx) => (
          <li key={member.id}>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                idx === active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-200"
                  : "text-gray-700 dark:text-gray-200"
              }`}
              onMouseEnter={() => setActive(idx)}
              onClick={() => select(member)}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-600/30 dark:text-brand-200">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  member.full_name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{member.full_name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
