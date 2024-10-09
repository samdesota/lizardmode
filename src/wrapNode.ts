import { LizardContext } from "./stateContexts";

const options = {
  "(": (code: string) => [`(${code})`],
  "[": (code: string) => [`[${code}]`],
  "{": (code: string) => [`{${code}}`],
  "'": (code: string) => [`'${code}'`],
  '"': (code: string) => [`"${code}"`],
  "`": (code: string) => [`\`${code}\``],
  i: (code: string) => ["if (condition) {", code, "}"],
  f: (code: string) => ["function name() {", code, "}"],
  a: (code: string) => [`() => ${code}`],
};

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

  const code = currentNode.text;
  const snippet = wrap(code);

  await ctx.insertSnippet(
    currentNode.startPosition,
    currentNode.endPosition,
    snippet,
  );
}
