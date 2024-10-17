import { LizardContext } from "./stateContexts";

const options: Record<
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
  f: { before: "function name() {", after: "}", singleLineWrap: false },
  a: { before: "() => " },
  c: { before: "const name = " },
  l: { before: "let name = " },
  C: { before: "name(", after: ")" },
  j: { before: "<tag>", after: "</tag>", singleLineWrap: false },
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

export async function wrapNode(ctx: LizardContext) {
  const key = (await ctx.readInput()) as keyof typeof options;
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  const wrap = options[key];

  if (!wrap) {
    return;
  }

  const indentation = ctx.getIndentation();
  const line = ctx.getLine(currentNode.startPosition.row);
  const whitespaceBeforeLine = getWhitespaceBeforeLine(line);
  const targetCode = currentNode.text;
  let wrapped = "";

  if (targetCode.includes("\n") || wrap.singleLineWrap === false) {
    const after = wrap.after ? `\n${whitespaceBeforeLine}${wrap.after}` : "";
    wrapped = `${wrap.before}\n${whitespaceBeforeLine}${addIndentation(targetCode, indentation)}${after}`;
  } else {
    wrapped = `${wrap.before}${targetCode}${wrap.after ?? ""}`;
  }

  await ctx.insertSnippet(
    currentNode.startPosition,
    currentNode.endPosition,
    wrapped,
  );
}
