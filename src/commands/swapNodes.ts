import { LizardContext } from "../stateContexts";

export const swapSiblingNodes = async (ctx: LizardContext) => {
  const currentNode = ctx.getCurrentNode();
  const siblingNode = currentNode?.nextNamedSibling;

  if (!currentNode || !siblingNode) {
    return;
  }

  ctx.edit([
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
};
