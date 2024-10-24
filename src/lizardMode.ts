import { createNode } from "./commands/createNode";
import { deleteNode } from "./commands/deleteNode";
import { moveVertical } from "./commands/navigation";
import { replaceNode } from "./commands/replaceNode";
import { swapSiblingNodes } from "./commands/swapNodes";
import { jump, jumpToParent } from "./jumpHints";
import { LizardContext } from "./stateContexts";
import { unwrapNode, wrapNode } from "./wrapNode";

const keyMap = {
  j: (ctx: LizardContext) => moveVertical(ctx, 1),
  k: (ctx: LizardContext) => moveVertical(ctx, -1),
  l: (ctx: LizardContext) => jump(ctx, { insideCurrentNode: true }),
  h: (ctx: LizardContext) => jumpToParent(ctx),
  J: (ctx: LizardContext) => swapSiblingNodes(ctx, 1),
  K: (ctx: LizardContext) => swapSiblingNodes(ctx, -1),
  r: (ctx: LizardContext) => replaceNode(ctx),
  g: (ctx: LizardContext) => jump(ctx),
  w: (ctx: LizardContext) => wrapNode(ctx),
  W: (ctx: LizardContext) => unwrapNode(ctx),
  d: (ctx: LizardContext) => deleteNode(ctx),
  c: (ctx: LizardContext) => deleteNode(ctx, { enterInsertMode: true }),
  a: (ctx: LizardContext) => createNode(ctx, { position: "after" }),
  A: (ctx: LizardContext) => createNode(ctx, { position: "before" }),
};

export async function createLizardModeState(ctx: LizardContext) {
  while (true) {
    const input = await ctx.readInput();

    const handler = keyMap[input as keyof typeof keyMap];

    if (handler) {
      await handler(ctx);
    }

    if (input === "i") {
      ctx.exitLizardMode("insert");
      break;
    }
  }
}
