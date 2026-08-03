import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Extra block nodes for the Koda editor: toggle (details/summary),
 * multi-column layouts and callouts. They are plain renderHTML nodes
 * (no React node views) so they stay light and serializable.
 */

export const ToggleSummaryNode = Node.create({
  name: "toggleSummary",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "p[data-toggle-summary]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes({ "data-toggle-summary": "" }, HTMLAttributes), 0];
  },
});

export const ToggleBodyNode = Node.create({
  name: "toggleBody",
  group: "block",
  content: "block+",
  parseHTML() {
    return [{ tag: "div[data-toggle-body]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-toggle-body": "" }, HTMLAttributes), 0];
  },
});

export const ToggleNode = Node.create({
  name: "toggle",
  group: "block",
  content: "toggleSummary toggleBody",
  parseHTML() {
    return [{ tag: "details[data-koda-toggle]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes({ "data-koda-toggle": "" }, HTMLAttributes),
      ["summary", 0],
      1,
    ];
  },
});

export const ColumnNode = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-column": "" }, HTMLAttributes), 0];
  },
});

export const Columns2Node = Node.create({
  name: "columns2",
  group: "block",
  content: "column column",
  parseHTML() {
    return [{ tag: "div[data-koda-columns='2']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-koda-columns": "2" }, HTMLAttributes),
      0,
      1,
    ];
  },
});

export const Columns3Node = Node.create({
  name: "columns3",
  group: "block",
  content: "column column column",
  parseHTML() {
    return [{ tag: "div[data-koda-columns='3']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-koda-columns": "3" }, HTMLAttributes),
      0,
      1,
      2,
    ];
  },
});

export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph",
  addAttributes() {
    return {
      icon: { default: "💡" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-koda-callout]",
        getAttrs: (el) => ({
          icon: (el as HTMLElement).getAttribute("data-icon") || "💡",
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const icon = (HTMLAttributes["data-icon"] as string) || "💡";
    return [
      "div",
      mergeAttributes({ "data-koda-callout": "" }, HTMLAttributes),
      ["span", { class: "koda-callout-icon", contenteditable: "false" }, icon],
      ["div", { class: "koda-callout-body" }, 0],
    ];
  },
});
