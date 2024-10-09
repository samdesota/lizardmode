import { moveVertical } from "./commands/navigation";
import { replaceNode } from "./commands/replaceNode";
import { swapSiblingNodes } from "./commands/swapNodes";
import { jump, jumpToParent } from "./jumpHints";
import { LizardContext } from "./stateContexts";

const keyMap = {
  j: (ctx: LizardContext) => moveVertical(ctx, 1),
  k: (ctx: LizardContext) => moveVertical(ctx, -1),
  l: (ctx: LizardContext) => jump(ctx, { insideCurrentNode: true }),
  h: (ctx: LizardContext) => jumpToParent(ctx),
  J: (ctx: LizardContext) => swapSiblingNodes(ctx, 1),
  K: (ctx: LizardContext) => swapSiblingNodes(ctx, -1),
  r: (ctx: LizardContext) => replaceNode(ctx),
  g: (ctx: LizardContext) => jump(ctx),
};

export async function createLizardModeState(ctx: LizardContext) {
  while (true) {
    const input = await ctx.readInput();

    const handler = keyMap[input as keyof typeof keyMap];

    if (input === "i") {
      break;
    }

    if (handler) {
      await handler(ctx);
    }
  }
}
