import { LizardContext } from "../types/lizardContext";
import {
  TreeSitter,
  TreeSitterNode,
  TreeSitterPoint,
} from "../tree-sitter/treeSitter";

export const wrapOptions: Record<
  string,
  { before: string; after?: string; singleLineWrap?: boolean }
> = {
  "(": { before: "(", after: ")" },
  "[": { before: "[", after: "]" },
  "{": { before: "{", after: "}" },
  "'": { before: "'", after: "'" },
  '"': { before: '"', after: '"' },
  "`": { before: "`", after: "`" },
  d: { before: "if (condition) {", after: "}", singleLineWrap: false },
  "?": { before: "condition ? ", after: ": alternative" },
  f: { before: "function name() {", after: "}", singleLineWrap: false },
  F: { before: "() => " },
  a: { before: "const name = " },
  A: { before: "let name = " },
  c: { before: "name(", after: ")" },
  C: { before: "console.log(", after: ")" },
  t: { before: "<tag>", after: "</tag>", singleLineWrap: false },
  r: { before: "return " },
  l: {
    before: "for (let i = 0; i < max; i++) {",
    after: "}",
    singleLineWrap: false,
  },
  L: {
    before: "while (condition) {",
    after: "}",
    singleLineWrap: false,
  },
};

export function addIndentation(text: string, indentation: string): string {
  return text
    .split("\n")
    .map((line) => indentation + line)
    .join("\n");
}

export function getWhitespaceBeforeLine(text: string) {
  const match = text.match(/^\s+/);
  return match ? match[0] : "";
}

export function findIndentationAtNode(
  ctx: LizardContext,
  node: TreeSitterNode,
) {
  const line = ctx.getLine(node.startPosition.row);
  const match = line.match(/^\s+/);
  return match ? match[0] : "";
}

export function getIndentedNode(
  ctx: LizardContext,
  wrap: { before: string; after?: string; singleLineWrap?: boolean },
  from: TreeSitterPoint,
  code: string,
) {
  const indentation = ctx.getIndentation();
  const line = ctx.getLine(from.row);
  const whitespaceBeforeLine = getWhitespaceBeforeLine(line);
  let wrapped = "";

  if (code.includes("\n") || (code && wrap.singleLineWrap === false)) {
    const after = wrap.after ? `\n${whitespaceBeforeLine}${wrap.after}` : "";
    wrapped = `${wrap.before}\n${whitespaceBeforeLine}${addIndentation(code, indentation)}${after}`;
  } else {
    wrapped = `${wrap.before}${code}${wrap.after ?? ""}`;
  }

  return wrapped;
}

export async function wrapNode(ctx: LizardContext) {
  const key = (await ctx.readInput()) as keyof typeof wrapOptions;
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  const wrap = wrapOptions[key];

  if (!wrap) {
    return;
  }

  const wrapped = getIndentedNode(
    ctx,
    wrap,
    currentNode.startPosition,
    currentNode.text,
  );

  return ctx.insertSnippet(
    currentNode.startPosition,
    currentNode.endPosition,
    wrapped,
  );
}

export const strategies: Record<
  string,
  (node: TreeSitterNode) => TreeSitterNode[]
> = {
  jsx_element: (node: TreeSitterNode) => {
    return [
      node.childForFieldName("open_tag") as TreeSitterNode,
      node.childForFieldName("close_tag") as TreeSitterNode,
    ];
  },

  statement_block: (node: TreeSitterNode) => {
    const parent = node.parent;

    if (parent?.type === "statement_block" || !parent) {
      return [
        node.firstChild as TreeSitterNode,
        node.lastChild as TreeSitterNode,
      ];
    }

    return parent.children.flatMap((child) => {
      if (child.type === "statement_block") {
        return [
          child.firstChild as TreeSitterNode,
          child.lastChild as TreeSitterNode,
        ];
      } else {
        return [child];
      }
    });
  },
};

export async function unwrapNode(ctx: LizardContext) {
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return null;
  }

  const parent = currentNode.parent;

  if (!parent) {
    return null;
  }

  console.log(parent.type);
  const strategy = strategies[parent.type];

  if (!strategy) {
    ctx.edit([
      {
        start: parent.startPosition,
        end: parent.endPosition,
        text: currentNode.text,
      },
    ]);
  } else {
    const nodes = strategy(parent);

    ctx.edit(
      nodes.map((node) => ({
        start: node.startPosition,
        end: node.endPosition,
        text: "",
      })),
    );
  }
}
