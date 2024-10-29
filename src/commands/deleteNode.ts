import { LizardContext } from "../types/lizardContext";
import { findNextNodeVertically } from "./navigation";

export const deleteNode = async (
  ctx: LizardContext,
  options: { enterInsertMode: boolean } = { enterInsertMode: false },
) => {
  const currentNode = ctx.getCurrentNode();

  if (!currentNode) {
    return;
  }

  if (!options.enterInsertMode) {
    const nextNode = findNextNodeVertically(1, currentNode);

    if (nextNode) {
      await ctx.jumpTo(nextNode);
    }
  }

  await ctx.edit([
    {
      start: currentNode.startPosition,
      end: currentNode.endPosition,
      removeWhenEmpty: true,
      text: "",
    },
  ]);

  if (options.enterInsertMode) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    await ctx.exitLizardMode("insert");
  }
};
