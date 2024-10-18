import { LizardContext } from "../stateContexts";
import { getIndentedNode, wrapOptions } from "../wrapNode";

export async function createNode(
  ctx: LizardContext,
  options: { position: "before" | "after" },
) {
  const key = (await ctx.readInput()) as keyof typeof wrapOptions;
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  const wrap = wrapOptions[key];

  if (!wrap) {
    return;
  }

  const node = getIndentedNode(ctx, wrap, currentNode.startPosition, "");

  if (options.position === "before") {
    return ctx.insertSnippet(
      currentNode.startPosition,
      currentNode.startPosition,
      node + "\n",
    );
  } else {
    return ctx.insertSnippet(
      currentNode.endPosition,
      currentNode.endPosition,
      "\n" + node,
    );
  }
}
