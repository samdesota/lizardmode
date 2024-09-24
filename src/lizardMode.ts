import { moveVertical } from "./commands/navigation";
import { replaceNode } from "./commands/replaceNode";
import { jump } from "./jumpHints";
import { LizardContext } from "./stateContexts";

const keyMap = {
  j: (ctx: LizardContext) => moveVertical(ctx, 1),
  k: (ctx: LizardContext) => moveVertical(ctx, -1),
  g: (ctx: LizardContext) => jump(ctx),
  r: (ctx: LizardContext) => replaceNode(ctx),
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
