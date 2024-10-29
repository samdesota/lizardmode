import { createNode } from "./createNode";
import { deleteNode } from "./deleteNode";
import { moveVertical } from "./navigation";
import { replaceNode } from "./replaceNode";
import { swapSiblingNodes } from "./swapNodes";
import { jump, jumpToParent } from "./jumpHints";
import { LizardContext } from "../types/lizardContext";
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
