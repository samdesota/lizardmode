import { LizardContext } from "./stateContexts";
import { TreeSitterPoint } from "./treeSitter";

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
  i: { before: "if (condition) {", after: "}", singleLineWrap: false },
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

  if (code.includes("\n") || wrap.singleLineWrap === false) {
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
