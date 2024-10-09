import { LizardContext } from "../stateContexts";
import { moveVertical, nextSibling } from "./navigation";

export const swapSiblingNodes = async (
  ctx: LizardContext,
  direction: 1 | -1,
) => {
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  const siblingNode = nextSibling(direction, currentNode);

  if (!siblingNode) {
    return;
  }

  await ctx.edit([
    {
      start: currentNode.startPosition,
      end: currentNode.endPosition,
      text: siblingNode.text,
    },
    {
      start: siblingNode.startPosition,
      end: siblingNode.endPosition,
      text: currentNode.text,
    },
  ]);

  console.log("Swapped nodes");

  await moveVertical(ctx, direction);
};
